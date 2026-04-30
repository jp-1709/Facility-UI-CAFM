import { db, frappeFetch } from '../frappe-sdk';

// VAT Rate Response Type
export interface VATRateResponse {
  rate: number;
  template_name: string;
}

// VAT Transaction Type
export interface VATTransaction {
  id: string;
  posting_date: string;
  voucher_type: string;
  voucher_no: string;
  reference: string;
  net_amount: number;
  vat_amount: number;
  gross_amount: number;
}

/**
 * Get current VAT rate from Item Tax Template using direct Frappe API
 */
export const getVATRate = async (): Promise<VATRateResponse> => {
  try {
    // Get the first Item Tax Template
    const templateResponse = await frappeFetch(
      '/api/resource/Item Tax Template?limit_page_length=1&fields=["name"]&order_by=creation asc'
    );
    
    if (!templateResponse.ok) {
      throw new Error('Failed to fetch Item Tax Template');
    }
    
    const templateData = await templateResponse.json();
    
    if (!templateData.data || templateData.data.length === 0) {
      return { rate: 16, template_name: 'Default' };
    }
    
    const template = templateData.data[0];
    
    // Get the template details with taxes
    const docResponse = await frappeFetch(
      `/api/resource/Item Tax Template/${template.name}?fields=["name","taxes"]`
    );
    
    if (!docResponse.ok) {
      throw new Error('Failed to fetch template details');
    }
    
    const docData = await docResponse.json();
    
    if (docData.data?.taxes && docData.data.taxes.length > 0) {
      const taxRate = docData.data.taxes[0].tax_rate || 16;
      return { rate: taxRate, template_name: template.name };
    }
    
    return { rate: 16, template_name: template.name };
    
  } catch (error) {
    console.error('Error getting VAT rate:', error);
    // Return default values on error
    return { rate: 16, template_name: 'Default' };
  }
};

/**
 * Get VAT transactions for date range using direct Frappe API
 */
export const getVATTransactions = async (
  fromDate: string,
  toDate: string
): Promise<VATTransaction[]> => {
  try {
    // Get GL Entries for VAT account
    const glResponse = await frappeFetch(
      `/api/resource/GL Entry?filters=[["account","=","VAT - QR"],["voucher_type","in",["Sales Invoice","Purchase Invoice"]],["posting_date",">=","${fromDate}"],["posting_date","<=","${toDate}"]]&fields=["name","posting_date","voucher_type","voucher_no"]&limit_page_length=1000&order_by=posting_date desc`
    );
    
    if (!glResponse.ok) {
      throw new Error('Failed to fetch GL entries');
    }
    
    const glData = await glResponse.json();
    
    if (!glData.data || glData.data.length === 0) {
      return [];
    }
    
    const transactions: VATTransaction[] = [];
    const processedVouchers = new Set<string>();
    
    // Process each GL entry
    for (const glEntry of glData.data) {
      // Skip if already processed this voucher
      if (processedVouchers.has(glEntry.voucher_no)) {
        continue;
      }
      processedVouchers.add(glEntry.voucher_no);
      
      try {
        // Get the voucher document
        const voucherResponse = await frappeFetch(
          `/api/resource/${encodeURIComponent(glEntry.voucher_type)}/${encodeURIComponent(glEntry.voucher_no)}`
        );
        
        if (!voucherResponse.ok) {
          console.warn(`Failed to fetch voucher ${glEntry.voucher_no}`);
          continue;
        }
        
        const voucherData = await voucherResponse.json();
        const doc = voucherData.data;
        
        // Get net amount
        const netAmount = doc.total || 0;
        
        // Get VAT amount and gross amount from taxes
        let vatAmount = 0;
        let grossAmount = 0;
        
        if (doc.taxes && Array.isArray(doc.taxes)) {
          const vatTax = doc.taxes.find((t: any) => t.account_head === 'VAT - QR');
          if (vatTax) {
            vatAmount = vatTax.base_tax_amount || 0;
            grossAmount = vatTax.base_total || 0;
          }
        }
        
        // Determine reference
        const reference = glEntry.voucher_type === 'Sales Invoice' ? 'Sales' : 'Invoice';
        
        transactions.push({
          id: glEntry.name,
          posting_date: glEntry.posting_date,
          voucher_type: glEntry.voucher_type,
          voucher_no: glEntry.voucher_no,
          reference: reference,
          net_amount: netAmount,
          vat_amount: vatAmount,
          gross_amount: grossAmount
        });
        
      } catch (error) {
        console.error(`Error processing voucher ${glEntry.voucher_no}:`, error);
        continue;
      }
    }
    
    return transactions;
    
  } catch (error) {
    console.error('Error getting VAT transactions:', error);
    return [];
  }
};

/**
 * Get VAT data for a specific month and year
 * Convenience function that calculates date range and fetches transactions
 */
export const getVATDataForMonth = async (
  year: string,
  month: string
): Promise<{
  rate: VATRateResponse;
  transactions: VATTransaction[];
}> => {
  try {
    // Calculate date range for the month
    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const monthIndex = parseInt(month) - 1; // Convert 1-based to 0-based
    const lastDay = new Date(parseInt(year), monthIndex + 1, 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;

    // Fetch both rate and transactions in parallel
    const [rateResponse, transactionsResponse] = await Promise.all([
      getVATRate(),
      getVATTransactions(startDate, endDate)
    ]);

    return {
      rate: rateResponse,
      transactions: transactionsResponse
    };
  } catch (error) {
    console.error('Error getting VAT data for month:', error);
    return {
      rate: { rate: 16, template_name: 'Default' },
      transactions: []
    };
  }
};
