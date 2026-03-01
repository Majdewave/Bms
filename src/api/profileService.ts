// Mock Profile Service
export interface UserProfile {
  id: string
  email: string
  name: string
  phone: string
  location: string
  role: string
  joinDate: string
  preferences: {
    emailNotifications: boolean
    appointmentReminders: boolean
    marketingEmails: boolean
  }
}

export interface PasswordChangeRequest {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

class ProfileService {
  async getProfile(): Promise<UserProfile> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          id: '1',
          email: 'john.doe@example.com',
          name: 'John Doe',
          phone: '+1 (555) 123-4567',
          location: 'San Francisco, CA 94103',
          role: 'Premium Member',
          joinDate: '2024-01-01',
          preferences: {
            emailNotifications: true,
            appointmentReminders: true,
            marketingEmails: false,
          },
        })
      }, 500)
    })
  }

  async updateProfile(profile: Partial<UserProfile>): Promise<UserProfile> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Simulate potential errors
        resolve({
          id: '1',
          email: profile.email || 'john.doe@example.com',
          name: profile.name || 'John Doe',
          phone: profile.phone || '+1 (555) 123-4567',
          location: profile.location || 'San Francisco, CA 94103',
          role: profile.role || 'Premium Member',
          joinDate: profile.joinDate || '2024-01-01',
          preferences: profile.preferences || {
            emailNotifications: true,
            appointmentReminders: true,
            marketingEmails: false,
          },
        })
      }, 800)
    })
  }

  async changePassword(passwordChange: PasswordChangeRequest): Promise<{ success: boolean; message: string }> {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        // Mock validation
        if (passwordChange.currentPassword !== 'password123') {
          reject(new Error('Current password is incorrect'))
          return
        }

        if (passwordChange.newPassword !== passwordChange.confirmPassword) {
          reject(new Error('New passwords do not match'))
          return
        }

        if (passwordChange.newPassword.length < 8) {
          reject(new Error('Password must be at least 8 characters'))
          return
        }

        resolve({
          success: true,
          message: 'Password changed successfully',
        })
      }, 1000)
    })
  }

  async updatePreferences(
    preferences: Partial<UserProfile['preferences']>,
  ): Promise<UserProfile['preferences']> {
    return new Promise((resolve) => {
      setTimeout(() => {
        resolve({
          emailNotifications: preferences.emailNotifications ?? true,
          appointmentReminders: preferences.appointmentReminders ?? true,
          marketingEmails: preferences.marketingEmails ?? false,
        })
      }, 500)
    })
  }
}

export const profileService = new ProfileService()
