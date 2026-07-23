import FilterDropdown from '@/platform/components/ui/FilterDropdown'

interface BusinessFiltersProps {
  mode?: 'businesses' | 'pendingApprovals'
  status: string
  plan: string
  trial: string
  registrationDate?: string
  businessType?: string
  onStatusChange: (value: string) => void
  onPlanChange: (value: string) => void
  onTrialChange: (value: string) => void
  onRegistrationDateChange?: (value: string) => void
  onBusinessTypeChange?: (value: string) => void
}

export default function BusinessFilters({
  mode = 'businesses',
  status,
  plan,
  trial,
  registrationDate = 'all',
  businessType = 'all',
  onStatusChange,
  onPlanChange,
  onTrialChange,
  onRegistrationDateChange,
  onBusinessTypeChange,
}: BusinessFiltersProps) {
  return (
    <div className="platform-toolbar-filters">
      <FilterDropdown
        label="Status"
        value={status}
        onChange={onStatusChange}
        options={[
          { value: 'all', label: 'All Statuses' },
          { value: 'Pending', label: 'Pending' },
          { value: 'Under Review', label: 'Under Review' },
          { value: 'Approved', label: 'Approved' },
          { value: 'Rejected', label: 'Rejected' },
          { value: 'Trial', label: 'Trial' },
          { value: 'Active', label: 'Active' },
          { value: 'Suspended', label: 'Suspended' },
          { value: 'Expired', label: 'Expired' },
        ]}
      />

      <FilterDropdown
        label="Plan"
        value={plan}
        onChange={onPlanChange}
        options={[
          { value: 'all', label: 'All Plans' },
          { value: 'Starter', label: 'Starter' },
          { value: 'Growth', label: 'Growth' },
          { value: 'Enterprise', label: 'Enterprise' },
        ]}
      />

      {mode === 'pendingApprovals' && (
        <>
          <FilterDropdown
            label="Registration Date"
            value={registrationDate}
            onChange={(value) => onRegistrationDateChange?.(value)}
            options={[
              { value: 'all', label: 'All Time' },
              { value: 'today', label: 'Today' },
              { value: 'last_7_days', label: 'Last 7 Days' },
              { value: 'last_30_days', label: 'Last 30 Days' },
            ]}
          />

          <FilterDropdown
            label="Business Type"
            value={businessType}
            onChange={(value) => onBusinessTypeChange?.(value)}
            options={[
              { value: 'all', label: 'All Types' },
              { value: 'Registered', label: 'Registered' },
              { value: 'Unspecified', label: 'Unspecified' },
            ]}
          />
        </>
      )}

      <FilterDropdown
        label="Trial"
        value={trial}
        onChange={onTrialChange}
        options={[
          { value: 'all', label: 'All' },
          { value: 'on_trial', label: 'On Trial' },
          { value: 'expired', label: 'Expired' },
          { value: 'not_on_trial', label: 'Not on Trial' },
        ]}
      />
    </div>
  )
}
