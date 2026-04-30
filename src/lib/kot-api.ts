import { db } from './frappe-sdk';

export interface KOTItem {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  item: string;
  item_name: string;
  quantity: string;
  comments: string;
  parent: string;
  parentfield: string;
  parenttype: string;
  doctype: string;
}

export interface KOTOrder {
  name: string;
  owner: string;
  creation: string;
  modified: string;
  modified_by: string;
  docstatus: number;
  idx: number;
  invoice: string;
  customer_name: string;
  date: string;
  time: string;
  type: string;
  order_status: string;
  production: string;
  start_time_prep: string;
  naming_series: string;
  pos_profile: string;
  branch: string;
  verified: number;
  order_no: number;
  customer_group: string;
  table_takeaway: number;
  user: string;
  doctype: string;
  kot_items: KOTItem[];
  __last_sync_on?: string;
}

export interface KOTStatusUpdate {
  name: string;
  order_status: string;
  start_time_prep?: string;
  end_time_prep?: string;
}

export const kotAPI = {
  // Get all KOT orders
  getAllKOTs: async (): Promise<KOTOrder[]> => {
    try {
      const response = await db.getDocList('URY KOT', {
        fields: [
          'name', 'invoice', 'customer_name', 'date', 'time', 'type', 
          'order_status', 'production', 'start_time_prep', 'table_takeaway', 
          'user', 'order_no'
        ],
        limit: 99999
      });
      
      // Fetch complete KOT documents with child table data
      const kotsWithItems = await Promise.all(
        (response || []).map(async (kot: any) => {
          try {
            const kotDoc = await db.getDoc('URY KOT', kot.name);
            return {
              ...kot,
              kot_items: kotDoc.kot_items || []
            };
          } catch (error) {
            console.error(`Error fetching KOT document ${kot.name}:`, error);
            return { ...kot, kot_items: [] };
          }
        })
      );
      
      return kotsWithItems;
    } catch (error) {
      console.error('Error fetching KOTs:', error);
      return [];
    }
  },

  // Get KOTs by status
  getKOTsByStatus: async (status: string): Promise<KOTOrder[]> => {
    try {
      const response = await db.getDocList('URY KOT', {
        fields: [
          'name', 'invoice', 'customer_name', 'date', 'time', 'type', 
          'order_status', 'production', 'start_time_prep', 'table_takeaway', 
          'user', 'order_no'
        ],
        filters: [['order_status', '=', status]],
        limit: 99999
      });
      
      // Fetch complete KOT documents with child table data
      const kotsWithItems = await Promise.all(
        (response || []).map(async (kot: any) => {
          try {
            const kotDoc = await db.getDoc('URY KOT', kot.name);
            return {
              ...kot,
              kot_items: kotDoc.kot_items || []
            };
          } catch (error) {
            console.error(`Error fetching KOT document ${kot.name}:`, error);
            return { ...kot, kot_items: [] };
          }
        })
      );
      
      return kotsWithItems;
    } catch (error) {
      console.error('Error fetching KOTs by status:', error);
      return [];
    }
  },

  // Update KOT status
  updateKOTStatus: async (kotData: KOTStatusUpdate): Promise<boolean> => {
    try {
      await db.updateDoc('URY KOT', kotData.name, kotData);
      return true;
    } catch (error) {
      console.error('Error updating KOT status:', error);
      return false;
    }
  },

  // Start preparing KOT
  startPreparing: async (kotName: string): Promise<boolean> => {
    return await kotAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Preparing'
    });
  },

  // Mark KOT as ready
  markReady: async (kotName: string): Promise<boolean> => {
    return await kotAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Ready'
    });
  },

  // Mark KOT as served
  markServed: async (kotName: string): Promise<boolean> => {
    return await kotAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Served'
    });
  },

  // Back to pending
  backToPending: async (kotName: string): Promise<boolean> => {
    return await kotAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Ready For Prepare'
    });
  }
};
