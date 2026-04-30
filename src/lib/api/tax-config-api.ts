import { frappeFetch } from '../frappe-sdk';

export interface VATHistoryEntry {
    rate: number;
    effective_date: string;
    end_date: string;
    description: string;
    status: string;
}

export interface PayrollBracket {
    name: string;
    from_amount: number;
    to_amount: number | null;
    percent_deduction: number;
    effective_from: string;
}

export interface TaxHistoryEntry {
    tax_type: string;
    category: string;
    rate: string;
    effective_date: string;
    end_date: string;
    description: string;
    status: string;
    created: string;
}

export interface TaxConfigData {
    vat_rate: number;
    vat_effective_date: string;
    vat_history: VATHistoryEntry[];
    payroll_brackets: PayrollBracket[];
    catering_levy: number;
    catering_effective_date: string;
    history: TaxHistoryEntry[];
}

export const getTaxConfig = async (): Promise<TaxConfigData> => {
    const config: TaxConfigData = {
        vat_rate: 0,
        vat_effective_date: "",
        vat_history: [],
        payroll_brackets: [],
        catering_levy: 0,
        catering_effective_date: "",
        history: []
    };

    try {
        // 1. Fetch VAT Info from Item Tax Template
        const vatResponse = await frappeFetch(
            `/api/resource/Item Tax Template?filters=[["name", "like", "%VAT%"]]&fields=["name", "creation", "modified"]&order_by=creation desc`
        );

        if (vatResponse.ok) {
            const vatData = await vatResponse.json();

            if (vatData.data && vatData.data.length > 0) {
                // Fetch details for each to get the rate
                for (let i = 0; i < vatData.data.length; i++) {
                    const template = vatData.data[i];
                    const docResponse = await frappeFetch(
                        `/api/resource/Item Tax Template/${encodeURIComponent(template.name)}`
                    );

                    if (docResponse.ok) {
                        const docData = await docResponse.json();
                        const doc = docData.data;

                        let rate = 0;
                        if (doc.tax_rates && doc.tax_rates.length > 0) {
                            rate = doc.tax_rates[0].tax_rate;
                        } else if (doc.taxes && doc.taxes.length > 0) {
                            rate = doc.taxes[0].tax_rate;
                        }

                        const effective_date = template.creation ? template.creation.split(' ')[0] : "";
                        const end_date = "-";
                        const status = i === 0 ? "Active" : "Archived";

                        if (i === 0) {
                            config.vat_rate = rate;
                            config.vat_effective_date = effective_date;
                        }

                        config.vat_history.push({
                            rate: rate,
                            effective_date: effective_date,
                            end_date: end_date,
                            description: `Rate from ${template.name}`,
                            status: status
                        });

                        config.history.push({
                            tax_type: "VAT",
                            category: template.name,
                            rate: `${rate}%`,
                            effective_date: effective_date,
                            end_date: end_date,
                            description: "Standard VAT Rate Update",
                            status: status,
                            created: effective_date
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching VAT Config:", error);
    }

    try {
        // 2. Fetch Catering Levy from Item Tax Template
        let cateringResponse = await frappeFetch(
            `/api/resource/Item Tax Template?filters=[["name", "like", "%Catering%Levy%Register%"]]&fields=["name", "creation", "modified"]&order_by=creation desc`
        );

        if (cateringResponse.ok) {
            let cateringData = await cateringResponse.json();

            if (!cateringData.data || cateringData.data.length === 0) {
                // Fallback search
                cateringResponse = await frappeFetch(
                    `/api/resource/Item Tax Template?filters=[["name", "like", "%Catering%Levy%"]]&fields=["name", "creation", "modified"]&order_by=creation desc`
                );
                if (cateringResponse.ok) {
                    cateringData = await cateringResponse.json();
                }
            }

            if (cateringData.data && cateringData.data.length > 0) {
                for (let i = 0; i < cateringData.data.length; i++) {
                    const template = cateringData.data[i];
                    const docResponse = await frappeFetch(
                        `/api/resource/Item Tax Template/${encodeURIComponent(template.name)}`
                    );

                    if (docResponse.ok) {
                        const docData = await docResponse.json();
                        const doc = docData.data;

                        let rate = 0;
                        if (doc.tax_rates && doc.tax_rates.length > 0) {
                            rate = doc.tax_rates[0].tax_rate;
                        } else if (doc.taxes && doc.taxes.length > 0) {
                            rate = doc.taxes[0].tax_rate;
                        }

                        const effective_date = template.creation ? template.creation.split(' ')[0] : "";
                        const status = i === 0 ? "Active" : "Archived";

                        if (i === 0) {
                            config.catering_levy = rate;
                            config.catering_effective_date = effective_date;
                        }

                        config.history.push({
                            tax_type: "Catering Levy",
                            category: template.name,
                            rate: `${rate}%`,
                            effective_date: effective_date,
                            end_date: "-",
                            description: "Catering Levy Rate Update",
                            status: status,
                            created: effective_date
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching Catering Config:", error);
    }

    try {
        // 3. Fetch Payroll Brackets from Income Tax Slab
        const slabResponse = await frappeFetch(
            `/api/resource/Income Tax Slab?fields=["name", "effective_from", "creation"]&order_by=effective_from desc`
        );

        if (slabResponse.ok) {
            const slabData = await slabResponse.json();

            if (slabData.data && slabData.data.length > 0) {
                const latest_slab = slabData.data[0];
                const docResponse = await frappeFetch(
                    `/api/resource/Income Tax Slab/${encodeURIComponent(latest_slab.name)}`
                );

                if (docResponse.ok) {
                    const docData = await docResponse.json();
                    const doc = docData.data;
                    const effective_from = latest_slab.effective_from || "";

                    let child_table = [];
                    if (doc.taxable_salary_slabs && doc.taxable_salary_slabs.length > 0) {
                        child_table = doc.taxable_salary_slabs;
                    } else if (doc.slabs && doc.slabs.length > 0) {
                        child_table = doc.slabs;
                    }

                    for (const row of child_table) {
                        config.payroll_brackets.push({
                            name: row.name,
                            from_amount: row.from_amount || 0,
                            to_amount: row.to_amount != null ? row.to_amount : -1,
                            percent_deduction: row.percent_deduction !== undefined ? row.percent_deduction : (row.tax_rate || 0),
                            effective_from: effective_from
                        });
                    }

                    for (let i = 0; i < slabData.data.length; i++) {
                        const slab = slabData.data[i];
                        const eff_date = slab.effective_from || "";
                        config.history.push({
                            tax_type: "Payroll Tax",
                            category: slab.name,
                            rate: "Various Brackets",
                            effective_date: eff_date,
                            end_date: "-",
                            description: "PAYE Income Tax Slab Update",
                            status: i === 0 ? "Active" : "Archived",
                            created: slab.creation ? slab.creation.split(' ')[0] : ""
                        });
                    }
                }
            }
        }
    } catch (error) {
        console.error("Error fetching Payroll Config:", error);
    }

    // Sort history by effective date descending
    config.history.sort((a, b) => {
        if (!a.effective_date) return 1;
        if (!b.effective_date) return -1;
        return new Date(b.effective_date).getTime() - new Date(a.effective_date).getTime();
    });

    return config;
};

export const updateVatRate = async (rate: number, effective_date: string) => {
    try {
        const response = await frappeFetch('/api/resource/Item Tax Template', {
            method: 'POST',
            body: JSON.stringify({
                title: `${rate}% VAT`,
                taxes: [
                    {
                        tax_type: "On Net Total",
                        account_head: "VAT - QR",
                        tax_rate: rate
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData._server_messages || 'Failed to update VAT rate');
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to update VAT rate:", error);
        throw error;
    }
};

export const updateCateringLevy = async (rate: number, effective_date: string) => {
    try {
        const response = await frappeFetch('/api/resource/Item Tax Template', {
            method: 'POST',
            body: JSON.stringify({
                title: `${rate}% Catering Training Levy (CTL) Register`,
                taxes: [
                    {
                        tax_type: "On Net Total",
                        account_head: "Catering Levy - QR",
                        tax_rate: rate
                    }
                ]
            })
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData._server_messages || 'Failed to update Catering Levy');
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to update Catering Levy:", error);
        throw error;
    }
};

export const updatePayrollBrackets = async (brackets: PayrollBracket[]) => {
    try {
        // Needs to fetch default company first, or assume standard
        const new_slab = {
            name: "PAYE Tracker - Latest",
            effective_from: new Date().toISOString().split('T')[0],
            taxable_salary_slabs: brackets.map(b => ({
                from_amount: b.from_amount,
                to_amount: b.to_amount === -1 ? null : b.to_amount,
                percent_deduction: b.percent_deduction
            }))
        };

        const response = await frappeFetch('/api/resource/Income Tax Slab', {
            method: 'POST',
            body: JSON.stringify(new_slab)
        });

        if (!response.ok) {
            // Fallback to "slabs" child table fieldname if taxable_salary_slabs fails
            const fallback_slab = { ...new_slab, slabs: new_slab.taxable_salary_slabs };
            delete (fallback_slab as any).taxable_salary_slabs;

            const fallbackResponse = await frappeFetch('/api/resource/Income Tax Slab', {
                method: 'POST',
                body: JSON.stringify(fallback_slab)
            });

            if (!fallbackResponse.ok) {
                const errorData = await fallbackResponse.json();
                throw new Error(errorData._server_messages || 'Failed to update payroll brackets');
            }
            return await fallbackResponse.json();
        }
        return await response.json();
    } catch (error) {
        console.error("Failed to update payroll brackets:", error);
        throw error;
    }
};
