import * as staffApi from './staff';

export interface Staff extends staffApi.StaffMember {}

export const staffService = {
  async getStaff(): Promise<Staff[]> {
    return staffApi.getStaffMembers();
  },
};
