import { call } from './frappe-sdk';

export interface MenuItem {
  item: string;
  item_name: string;
  item_image: string | null;
  rate: number | string;
  course: string;
  trending?: boolean;
  popular?: boolean;
  recommended?: boolean;
  description?: string;
  special_dish?: 1 | 0;
}

export interface URYMenuItem {
  name: string;
  item: string;
  item_name: string;
  rate: number;
  special_dish: 0 | 1;
  disabled: 0 | 1;
  course: string;
}

export interface URYMenu {
  name: string;
  enabled: 1 | 0;
  price_list: string;
  items: URYMenuItem[];
}

export interface GetMenuResponse {
  message: {
    items: MenuItem[];
  };
}

export interface GetAggregatorMenuResponse {
  message: MenuItem[];
}

export interface GetURYMenuResponse {
  message: URYMenu[];
}

export const getRestaurantMenu = async (posProfile: string, room: string | null, order_type: string | null) => {
  try {
    const response = await call.get<GetMenuResponse>(
      'ury.ury_pos.api.getRestaurantMenu',
      {
        pos_profile: posProfile,
        room: room,
        order_type: order_type
      }
    );
    return response.message.items;
  } catch (error: any) {
    if (error._server_messages) {
      const messages = JSON.parse(error._server_messages);
      const message = JSON.parse(messages[0]);
      throw new Error(message.message);
    }
    throw error;
  }
};

export const getAggregatorMenu = async (aggregator: string) => {
  try {
    const response = await call.get<GetAggregatorMenuResponse>(
      'ury.ury_pos.api.getAggregatorItem',
      {
        aggregator
      }
    );
    return response.message;
  } catch (error: any) {
    if (error._server_messages) {
      const messages = JSON.parse(error._server_messages);
      const message = JSON.parse(messages[0]);
      throw new Error(message.message);
    }
    throw error;
  }
};

// export const getURYMenus = async (): Promise<URYMenu[]> => {
//   try {
//     // Get POS profile first
//     const posProfile = await getPosProfileLimitedFields();
//     if (!posProfile || !posProfile.pos_profile) {
//       throw new Error('No POS profile found. Please configure your POS profile.');
//     }

//     // Get the restaurant menu using the POS profile
//     const restaurantResponse = await call.get<{ message: any }>(
//       'ury.ury_pos.api.getRestaurantMenu',
//       {
//         pos_profile: posProfile.pos_profile
//       }
//     );
    
//     if (!restaurantResponse.message || !restaurantResponse.message.items) {
//       return [];
//     }

//     // Transform the data to match our expected format
//     const transformedItems: URYMenuItem[] = restaurantResponse.message.items.map((item: any) => ({
//       name: item.name || item.item, // Use the actual URY Menu Item name if available
//       item: item.item,
//       item_name: item.item_name,
//       rate: typeof item.rate === 'string' ? parseFloat(item.rate) : item.rate,
//       special_dish: item.special_dish || 0,
//       disabled: item.disabled || 0,
//       course: item.course || 'Uncategorized',
//       parent: item.parent || 'Menu Items'
//     }));
    
//     const menuData: URYMenu = {
//       name: 'Menu Items',
//       enabled: 1,
//       price_list: 'Standard',
//       items: transformedItems
//     };
    
//     return [menuData];
//   } catch (error: any) {
//     if (error._server_messages) {
//       const messages = JSON.parse(error._server_messages);
//       const message = JSON.parse(messages[0]);
//       throw new Error(message.message);
//     }
//     throw new Error('Failed to fetch menu data. Please check your POS configuration.');
//   }
// };

export interface NewMenuItem {
  item: string;
  item_name: string;
  rate: number;
  description?: string;
  cost?: number;
  prep_time_minutes?: number;
  course?: string;
  item_type?: string;
  allergens?: string;
  dietary_tags?: string;
  item_image?: string;
  special_dish?: boolean;
}

export const createMenuItem = async (menuItem: NewMenuItem) => {
  try {
    // First get the active URY Menu to append to
    const menuResponse = await call.get<{ message: URYMenu[] }>(
      'frappe.client.get_list',
      {
        doctype: 'URY Menu',
        fields: ['name'],
        filters: { enabled: 1 },
        limit: 1
      }
    );

    if (menuResponse.message.length === 0) {
      throw new Error('No active menu found. Please create a menu first.');
    }

    const menuName = menuResponse.message[0].name;

    // Create the new menu item
    const newItem = await call.post<{ message: URYMenuItem }>(
      'frappe.client.insert',
      {
        doc: {
          doctype: 'URY Menu Item',
          item: menuItem.item,
          item_name: menuItem.item_name,
          rate: menuItem.rate,
          description: menuItem.description || '',
          cost: menuItem.cost || 0,
          prep_time_minutes: menuItem.prep_time_minutes || 0,
          course: menuItem.course || 'Uncategorized',
          item_type: menuItem.item_type || 'Goods',
          allergens: menuItem.allergens || '',
          dietary_tags: menuItem.dietary_tags || '',
          special_dish: menuItem.special_dish ? 1 : 0,
          disabled: 0,
          parent: menuName,
          parentfield: 'items',
          parenttype: 'URY Menu'
        }
      }
    );

    return newItem.message;
  } catch (error: any) {
    if (error._server_messages) {
      const messages = JSON.parse(error._server_messages);
      const message = JSON.parse(messages[0]);
      throw new Error(message.message);
    }
    throw new Error('Failed to create menu item. Please try again.');
  }
};

export const updateMenuItem = async (itemName: string, updates: {
  item_name?: string;
  rate?: number;
  course?: string;
  special_dish?: boolean;
}) => {
  try {
    // Use custom Python method to bypass parent permission issues
    const updatedItem = await call.post<{ message: URYMenuItem }>(
      'quantbit_ury_customization.ury_customization.menu_api.update_menu_item',
      {
        name: itemName,
        updates: updates
      }
    );

    return updatedItem.message;
  } catch (error: any) {
    console.error('API Error:', error);
    if (error._server_messages) {
      const messages = JSON.parse(error._server_messages);
      const message = JSON.parse(messages[0]);
      throw new Error(message.message);
    }
    throw new Error('Failed to update menu item. Please try again.');
  }
};

export interface ItemSearchResult {
  name: string;
  item_name: string;
  item_group: string;
  description?: string;
  stock_uom: string;
}

export const searchItems = async (searchTerm: string): Promise<ItemSearchResult[]> => {
  try {
    const response = await call.get<{ message: ItemSearchResult[] }>(
      'frappe.client.get_list',
      {
        doctype: 'Item',
        fields: ['name', 'item_name', 'item_group', 'description', 'stock_uom'],
        filters: {
          item_name: ['like', `%${searchTerm}%`],
          disabled: 0
        },
        limit: 50
      }
    );
    return response.message;
  } catch (error: any) {
    if (error._server_messages) {
      const messages = JSON.parse(error._server_messages);
      const message = JSON.parse(messages[0]);
      throw new Error(message.message);
    }
    throw new Error('Failed to search items. Please try again.');
  }
}; 