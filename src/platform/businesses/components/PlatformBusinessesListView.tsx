import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import BusinessStatCard from '@/platform/businesses/components/BusinessStatCard'
import BusinessTable from '@/platform/businesses/components/BusinessTable'
import BusinessToolbar from '@/platform/businesses/components/BusinessToolbar'
import {
  activateBusiness,
  approveBusiness,
  deleteBusiness,
  fetchPlatformBusinesses,
  notifyBusinessesUpdated,
  rejectBusiness,
  subscribeBusinessesUpdated,
  suspendBusiness,
  type BusinessesResult,
} from '@/platform/businesses/services/platformBusinessesService'
import type { BusinessRecord, SortOption, TrialFilter } from '@/platform/businesses/types'
import Pagination from '@/platform/components/ui/Pagination'
import { PlatformApiError } from '@/platform/services/platformApiClient'

interface PlatformBusinessesListViewProps {
  mode: 'businesses' | 'pendingApprovals'
  title: string
  subtitle: string
  detailsBasePath: string
  defaultStatus: string
  showAddBusinessButton?: boolean
}

const rowsPerPageOptions = [10, 20, 50]

const includesInsensitive = (source: string, target: string) =>
  source.toLowerCase().includes(target.toLowerCase().trim())

const isTrialExpired = (value: string | null) => {
  if (!value) return false
  return new Date(value).getTime() < Date.now()
}

export default function PlatformBusinessesListView({
  mode,
  title,
  subtitle,
  detailsBasePath,
  defaultStatus,
  showAddBusinessButton = false,
}: PlatformBusinessesListViewProps) {
  const navigate = useNavigate()
  const location = useLocation()

  const [allBusinesses, setAllBusinesses] = useState<BusinessRecord[]>([])
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    trial: 0,
    active: 0,
    suspended: 0,
    approvedToday: 0,
    rejectedToday: 0,
    averageApprovalTimeHours: 0,
  })
  const [serverFiltering, setServerFiltering] = useState(false)
  const [serverPagination, setServerPagination] = useState(false)
  const [serverTotal, setServerTotal] = useState(0)
  const [serverPage, setServerPage] = useState(1)
  const [serverPageSize, setServerPageSize] = useState(10)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [searchName, setSearchName] = useState('')
  const [searchOwner, setSearchOwner] = useState('')
  const [statusFilter, setStatusFilter] = useState(defaultStatus)
  const [planFilter, setPlanFilter] = useState('all')
  const [trialFilter, setTrialFilter] = useState<TrialFilter>('all')
  const [sortBy, setSortBy] = useState<SortOption>('newest')
  const [registrationDateFilter, setRegistrationDateFilter] = useState('all')
  const [businessTypeFilter, setBusinessTypeFilter] = useState('all')

  const [page, setPage] = useState(1)
  const [rowsPerPage, setRowsPerPage] = useState(10)

  const loadBusinessesRef = useRef<(signal?: AbortSignal) => Promise<void>>(async () => {})

  const loadBusinesses = useCallback(async (signal?: AbortSignal) => {
    setLoading(true)
    setError(null)

    try {
      const result: BusinessesResult = await fetchPlatformBusinesses({
        page,
        pageSize: rowsPerPage,
        searchName,
        searchOwner,
        registrationDate: registrationDateFilter,
        businessType: businessTypeFilter,
        status: statusFilter,
        plan: planFilter,
        trial: trialFilter,
        sort: sortBy,
      }, signal)

      setAllBusinesses(result.items)
      setStats(result.stats)
      setServerFiltering(result.serverFiltering)
      setServerPagination(result.serverPagination)
      setServerTotal(result.total)
      setServerPage(result.page)
      setServerPageSize(result.pageSize)
    } catch (err) {
      if (signal?.aborted) {
        return
      }

      if (err instanceof PlatformApiError) {
        setError(err.message)
      } else {
        setError('Please check your connection and try again.')
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false)
      }
    }
  }, [
    page,
    rowsPerPage,
    searchName,
    searchOwner,
    registrationDateFilter,
    businessTypeFilter,
    statusFilter,
    planFilter,
    trialFilter,
    sortBy,
  ])

  useEffect(() => {
    loadBusinessesRef.current = loadBusinesses
  }, [loadBusinesses])

  useEffect(() => {
    setStatusFilter(defaultStatus)
  }, [defaultStatus])

  useEffect(() => {
    const controller = new AbortController()
    void loadBusinesses(controller.signal)
    return () => controller.abort()
  }, [loadBusinesses])

  useEffect(() => {
    return subscribeBusinessesUpdated(() => {
      void loadBusinessesRef.current()
    })
  }, [])

  useEffect(() => {
    if (!serverFiltering) {
      setPage(1)
    }
  }, [
    searchName,
    searchOwner,
    registrationDateFilter,
    businessTypeFilter,
    statusFilter,
    planFilter,
    trialFilter,
    sortBy,
    serverFiltering,
  ])

  const filteredAndSorted = useMemo(() => {
    if (serverFiltering) {
      return allBusinesses
    }

    const filtered = allBusinesses.filter((business) => {
      if (searchName && !includesInsensitive(business.name, searchName)) return false
      if (searchOwner && !includesInsensitive(business.ownerName, searchOwner)) return false

      if (mode === 'pendingApprovals') {
        if (registrationDateFilter === 'today') {
          const created = new Date(business.createdAt)
          const now = new Date()
          if (created.toDateString() !== now.toDateString()) return false
        }

        if (registrationDateFilter === 'last_7_days') {
          const created = new Date(business.createdAt).getTime()
          if (created < Date.now() - 7 * 24 * 60 * 60 * 1000) return false
        }

        if (registrationDateFilter === 'last_30_days') {
          const created = new Date(business.createdAt).getTime()
          if (created < Date.now() - 30 * 24 * 60 * 60 * 1000) return false
        }

        if (businessTypeFilter !== 'all' && (business.businessType || 'Unspecified') !== businessTypeFilter) return false
      }

      if (statusFilter !== 'all') {
        const statusToCompare = mode === 'pendingApprovals' ? business.approvalStatus : business.status
        if (statusToCompare !== statusFilter) return false
      }

      if (planFilter !== 'all' && business.plan !== planFilter) return false

      if (trialFilter === 'on_trial' && business.status !== 'Trial') return false
      if (trialFilter === 'expired' && !isTrialExpired(business.trialEndsAt)) return false
      if (trialFilter === 'not_on_trial' && business.status === 'Trial') return false

      return true
    })

    const sorted = [...filtered]

    if (sortBy === 'name') {
      sorted.sort((a, b) => a.name.localeCompare(b.name))
      return sorted
    }

    sorted.sort((a, b) => {
      const left = new Date(a.createdAt).getTime()
      const right = new Date(b.createdAt).getTime()
      if (sortBy === 'newest') return right - left
      return left - right
    })

    return sorted
  }, [
    allBusinesses,
    mode,
    searchName,
    searchOwner,
    registrationDateFilter,
    businessTypeFilter,
    statusFilter,
    planFilter,
    trialFilter,
    sortBy,
    serverFiltering,
  ])

  const totalItems = serverPagination ? serverTotal : filteredAndSorted.length
  const totalPages = Math.max(1, Math.ceil(totalItems / rowsPerPage))
  const currentPage = serverPagination ? serverPage : Math.min(page, totalPages)

  const paginatedBusinesses = useMemo(() => {
    if (serverPagination) return filteredAndSorted
    const start = (currentPage - 1) * rowsPerPage
    return filteredAndSorted.slice(start, start + rowsPerPage)
  }, [filteredAndSorted, currentPage, rowsPerPage, serverPagination])

  const runAction = async (action: () => Promise<void>) => {
    try {
      await action()
      notifyBusinessesUpdated()
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Action failed.'
      setError(message)
    }
  }

  return (
    <div className="platform-page">
      <header className="platform-page-header">
        <div>
          <h2 className="platform-page-title">{title}</h2>
          <p className="platform-page-subtitle">{subtitle}</p>
        </div>

        {showAddBusinessButton && (
          <button type="button" className="platform-button-primary">
            + Add Business
          </button>
        )}
      </header>

      <section className="platform-stats-grid">
        <BusinessStatCard label="Total Businesses" value={stats.total} />
        <BusinessStatCard label="Pending Approval" value={stats.pending} />
        <BusinessStatCard label="Trial" value={stats.trial} />
        <BusinessStatCard label="Active" value={stats.active} />
        <BusinessStatCard label="Suspended" value={stats.suspended} />
      </section>

      {mode === 'pendingApprovals' && (
        <section className="platform-stats-grid">
          <BusinessStatCard label="Approved Today" value={stats.approvedToday} />
          <BusinessStatCard label="Rejected Today" value={stats.rejectedToday} />
          <BusinessStatCard label="Avg Approval Hours" value={stats.averageApprovalTimeHours} />
        </section>
      )}

      <BusinessToolbar
        mode={mode}
        searchName={searchName}
        searchOwner={searchOwner}
        status={statusFilter}
        plan={planFilter}
        trial={trialFilter}
        sort={sortBy}
        registrationDate={registrationDateFilter}
        businessType={businessTypeFilter}
        onSearchNameChange={setSearchName}
        onSearchOwnerChange={setSearchOwner}
        onStatusChange={setStatusFilter}
        onPlanChange={setPlanFilter}
        onTrialChange={(value) => setTrialFilter(value as TrialFilter)}
        onSortChange={(value) => setSortBy(value as SortOption)}
        onRegistrationDateChange={setRegistrationDateFilter}
        onBusinessTypeChange={setBusinessTypeFilter}
      />

      <section className="platform-card">
        <BusinessTable
          mode={mode}
          businesses={paginatedBusinesses}
          loading={loading}
          error={error}
          onRetry={loadBusinesses}
          onView={(business) => {
            const returnTo = `${location.pathname}${location.search}`
            navigate(`${detailsBasePath}/${business.id}`, { state: { returnTo } })
          }}
          onApprove={(business) => {
            if (!window.confirm(`Approve ${business.name}?`)) {
              return
            }

            void runAction(() => approveBusiness(business.id))
          }}
          onReject={(business) => {
            if (!window.confirm(`Reject ${business.name}?`)) {
              return
            }

            const reason = window.prompt('Optional rejection reason:') || undefined
            void runAction(() => rejectBusiness(business.id, reason))
          }}
          onRequestMoreInfo={() => {
            window.alert('Request More Information is not available yet.')
          }}
          onSuspend={(business) => runAction(() => suspendBusiness(business.id))}
          onActivate={(business) => runAction(() => activateBusiness(business.id))}
          onDelete={(business) => runAction(() => deleteBusiness(business.id))}
        />

        {!loading && !error && (
          <Pagination
            page={currentPage}
            totalPages={totalPages}
            rowsPerPage={serverPagination ? serverPageSize : rowsPerPage}
            rowsPerPageOptions={rowsPerPageOptions}
            onPageChange={setPage}
            onRowsPerPageChange={(value) => {
              setRowsPerPage(value)
              setPage(1)
            }}
          />
        )}
      </section>
    </div>
  )
}
