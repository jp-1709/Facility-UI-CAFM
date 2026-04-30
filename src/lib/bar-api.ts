import { db } from './frappe-sdk';
import { KOTOrder, KOTItem, KOTStatusUpdate } from './kot-api';

export type { KOTOrder, KOTItem };

// ─────────────────────────────────────────────────────────────────────────────
// Bar item codes — fetched ONCE per session from Item doctype
// Only items where custom_bar_item = 1 (checked) are valid bar items.
// ─────────────────────────────────────────────────────────────────────────────

let _barItemCache: Set<string> | null = null;

const getBarItemCodes = async (): Promise<Set<string>> => {
  if (_barItemCache !== null) return _barItemCache;

  try {
    const items = await db.getDocList('Item', {
      fields: ['name', 'item_name'],
      filters: [
        ['custom_bar_item', '=', 1],
        ['disabled',  '=', 0],
      ],
      limit: 99999,
    });

    _barItemCache = new Set((items || []).map((i: any) => String(i.name)));
    console.log(`[barAPI] Bar item codes loaded: ${_barItemCache.size}`);
    console.log('[barAPI] Bar items with custom_bar_item=1:', items || []);
    return _barItemCache;
  } catch (error) {
    console.error('[barAPI] Failed to load bar item codes from Item doctype:', error);
    return new Set(); // fallback: empty set → show all items
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// Core fetch — mirrors kotAPI EXACTLY (db.getDocList + db.getDoc per KOT)
// After getting kotDoc.kot_items, filter to only bar items.
// KOTs with zero bar items are dropped.
// ─────────────────────────────────────────────────────────────────────────────

const fetchKOTsWithBarItems = async (listFilters: any[]): Promise<KOTOrder[]> => {
  // Fetch KOT list AND bar item codes in parallel
  const [response, barCodes] = await Promise.all([
    db.getDocList('URY KOT', {
      fields: [
        'name', 'invoice', 'customer_name', 'date', 'time', 'type',
        'order_status', 'production', 'start_time_prep', 'table_takeaway',
        'user', 'order_no',
      ],
      filters: listFilters,
      limit: 99999,
    }),
    getBarItemCodes(),
  ]);

  // For each KOT, fetch the full doc (to get kot_items child table)
  // — same pattern as kotAPI
  const kotsWithItems = await Promise.all(
    (response || []).map(async (kot: any) => {
      try {
        const kotDoc = await db.getDoc('URY KOT', kot.name);
        const allItems: KOTItem[] = kotDoc.kot_items || [];

        // Filter kot_items: keep only rows where the `item` field
        // (Link → Item doctype) has custom_bar_item = 1
        const barItems = barCodes.size > 0
          ? allItems.filter(i =>
              barCodes.has(i.item) ||        // match by item code
              barCodes.has(i.item_name)       // match by item_name as fallback
            )
          : allItems; // if Item lookup failed, show all as fallback

        // Debug logging
        if (allItems.length > 0) {
          console.log(`[barAPI] KOT ${kot.name}: ${allItems.length} total items, ${barItems.length} bar items`);
          console.log('[barAPI] Bar item codes:', Array.from(barCodes));
          console.log('[barAPI] All items in KOT:', allItems.map(i => ({ item: i.item, name: i.item_name })));
          console.log('[barAPI] Filtered bar items:', barItems.map(i => ({ item: i.item, name: i.item_name })));
        }

        return { ...kot, kot_items: barItems };
      } catch (error) {
        console.error(`[barAPI] Error fetching URY KOT ${kot.name}:`, error);
        return { ...kot, kot_items: [] };
      }
    })
  );

  // Only return KOTs that contain at least one bar item
  return kotsWithItems.filter(k => (k.kot_items || []).length > 0);
};

// ─────────────────────────────────────────────────────────────────────────────
// Public API  (mirrors kotAPI interface 1:1)
// ─────────────────────────────────────────────────────────────────────────────

export const barAPI = {

  /** All orders regardless of status */
  getAllBarOrders: async (): Promise<KOTOrder[]> => {
    try {
      return await fetchKOTsWithBarItems([]);
    } catch (error) {
      console.error('[barAPI] getAllBarOrders error:', error);
      return [];
    }
  },

  /** Orders filtered by order_status */
  getBarOrdersByStatus: async (status: string): Promise<KOTOrder[]> => {
    try {
      return await fetchKOTsWithBarItems([['order_status', '=', status]]);
    } catch (error) {
      console.error(`[barAPI] getBarOrdersByStatus(${status}) error:`, error);
      return [];
    }
  },

  /** Generic status updater — identical to kotAPI.updateKOTStatus */
  updateKOTStatus: async (kotData: KOTStatusUpdate): Promise<boolean> => {
    try {
      await db.updateDoc('URY KOT', kotData.name, kotData);
      return true;
    } catch (error) {
      console.error('[barAPI] updateKOTStatus error:', error);
      return false;
    }
  },

  /** Queued → Mixing (equivalent of kotAPI.startPreparing) */
  startMixing: async (kotName: string): Promise<boolean> => {
    return barAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Preparing',
    });
  },

  /** Mixing → Ready */
  markReady: async (kotName: string): Promise<boolean> => {
    return barAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Ready',
    } as any);
  },

  /** Ready → Served */
  markServed: async (kotName: string): Promise<boolean> => {
    return barAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Served',
    });
  },

  /** Any → Back to Queue */
  backToQueue: async (kotName: string): Promise<boolean> => {
    return barAPI.updateKOTStatus({
      name: kotName,
      order_status: 'Ready For Prepare',
    });
  },
};
