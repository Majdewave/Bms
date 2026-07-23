import BusinessFilters from '@/platform/businesses/components/BusinessFilters'
import SearchInput from '@/platform/components/ui/SearchInput'
import FilterDropdown from '@/platform/components/ui/FilterDropdown'

interface BusinessToolbarProps {
  mode?: 'businesses' | 'pendingApprovals'
  searchName: string
  searchOwner: string
  status: string
  plan: string
  trial: string
  sort: string
  registrationDate?: string
  businessType?: string
  onSearchNameChange: (value: string) => void
  onSearchOwnerChange: (value: string) => void
  onStatusChange: (value: string) => void
  onPlanChange: (value: string) => void
  onTrialChange: (value: string) => void
  onSortChange: (value: string) => void
  onRegistrationDateChange?: (value: string) => void
  onBusinessTypeChange?: (value: string) => void
}

export default function BusinessToolbar(props: BusinessToolbarProps) {
  const {
    mode = 'businesses',
    searchName,
    searchOwner,
    status,
    plan,
    trial,
    sort,
    registrationDate = 'all',
    businessType = 'all',
    onSearchNameChange,
    onSearchOwnerChange,
    onStatusChange,
    onPlanChange,
    onTrialChange,
    onSortChange,
    onRegistrationDateChange,
    onBusinessTypeChange,
  } = props

  return (
    <section className="platform-toolbar-card">
      <div className="platform-toolbar-grid">
        <SearchInput value={searchName} placeholder="Search business name" onChange={onSearchNameChange} />
        <SearchInput value={searchOwner} placeholder="Search owner" onChange={onSearchOwnerChange} />
        <FilterDropdown
          label="Sort"
          value={sort}
          onChange={onSortChange}
          options={[
            { value: 'newest', label: 'Newest' },
            { value: 'oldest', label: 'Oldest' },
            { value: 'name', label: 'Name' },
          ]}
        />
      </div>

      <BusinessFilters
        mode={mode}
        status={status}
        plan={plan}
        trial={trial}
        registrationDate={registrationDate}
        businessType={businessType}
        onStatusChange={onStatusChange}
        onPlanChange={onPlanChange}
        onTrialChange={onTrialChange}
        onRegistrationDateChange={onRegistrationDateChange}
        onBusinessTypeChange={onBusinessTypeChange}
      />
    </section>
  )
}
