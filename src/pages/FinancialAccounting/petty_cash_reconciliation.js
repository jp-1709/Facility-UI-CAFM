// JavaScript Client Script for Petty Cash Reconciliation
// This script handles the client-side logic for the Petty Cash Reconciliation DocType

frappe.ui.form.on('Petty Cash Reconciliation', {
    refresh: function(frm) {
        // Add custom buttons
        frm.add_custom_button(__('Get System Balance'), function() {
            get_system_balance(frm);
        });
        
        frm.add_custom_button(__('View Transactions'), function() {
            view_transactions(frm);
        });
        
        frm.add_custom_button(__('Print Reconciliation'), function() {
            print_reconciliation(frm);
        });
        
        // Set default values
        if (!frm.doc.reconciled_by) {
            frm.set_value('reconciled_by', frappe.session.user);
        }
    },
    
    onload: function(frm) {
        // Auto-calculate difference when physical balance changes
        frm.add_fetch('petty_cash_account', 'account_name', 'account_name');
        
        // Get system balance on load
        if (frm.doc.petty_cash_account && frm.doc.date) {
            get_system_balance(frm);
        }
    },
    
    petty_cash_account: function(frm) {
        // When account changes, get new system balance
        if (frm.doc.petty_cash_account && frm.doc.date) {
            get_system_balance(frm);
        }
    },
    
    date: function(frm) {
        // When date changes, get new system balance
        if (frm.doc.petty_cash_account && frm.doc.date) {
            get_system_balance(frm);
        }
    },
    
    physical_balance: function(frm) {
        // Calculate difference whenever physical balance changes
        calculate_difference(frm);
    },
    
    system_balance: function(frm) {
        // Calculate difference whenever system balance changes
        calculate_difference(frm);
    },
    
    before_save: function(frm) {
        // Set reconciliation status before saving
        set_reconciliation_status(frm);
        
        // Set reconciled by if not set
        if (!frm.doc.reconciled_by) {
            frm.set_value('reconciled_by', frappe.session.user);
        }
    },
    
    after_save: function(frm) {
        // Show recent transactions after save
        show_recent_transactions(frm);
    }
});

// Function to get system balance
function get_system_balance(frm) {
    if (!frm.doc.petty_cash_account || !frm.doc.date) {
        return;
    }
    
    frappe.call({
        method: 'frappe.client.get_value',
        args: {
            doctype: 'GL Entry',
            filters: {
                account: frm.doc.petty_cash_account,
                posting_date: ['<=', frm.doc.date],
                is_cancelled: 0,
                docstatus: 1
            },
            fieldname: 'SUM(debit) - SUM(credit) as balance'
        },
        callback: function(r) {
            if (r.message && r.message.balance) {
                frm.set_value('system_balance', parseFloat(r.message.balance));
                calculate_difference(frm);
            } else {
                frm.set_value('system_balance', 0);
                calculate_difference(frm);
            }
        }
    });
}

// Function to calculate difference
function calculate_difference(frm) {
    let system_balance = frm.doc.system_balance || 0;
    let physical_balance = frm.doc.physical_balance || 0;
    let difference = physical_balance - system_balance;
    
    frm.set_value('difference', difference);
    
    // Update reconciliation status
    set_reconciliation_status(frm);
    
    // Add visual indicators
    if (Math.abs(difference) < 0.01) {
        // Perfect match
        frm.dashboard.clear_comment();
        frm.dashboard.add_comment(__('Balances Match!'), 'green');
    } else if (difference > 0) {
        // Physical cash is more
        frm.dashboard.clear_comment();
        frm.dashboard.add_comment(__('Physical cash exceeds system balance by: ' + format_currency(difference)), 'orange');
    } else {
        // Physical cash is less
        frm.dashboard.clear_comment();
        frm.dashboard.add_comment(__('Physical cash shortfall: ' + format_currency(Math.abs(difference))), 'red');
    }
}

// Function to set reconciliation status
function set_reconciliation_status(frm) {
    let system_balance = frm.doc.system_balance || 0;
    let physical_balance = frm.doc.physical_balance || 0;
    let difference = physical_balance - system_balance;
    
    if (Math.abs(difference) < 0.01) {
        frm.set_value('reconciliation_status', 'Matched');
    } else {
        frm.set_value('reconciliation_status', 'Mismatch');
    }
}

// Function to view transactions
function view_transactions(frm) {
    if (!frm.doc.petty_cash_account) {
        frappe.msgprint(__('Please select a Petty Cash Account first'));
        return;
    }
    
    let filters = {
        account: frm.doc.petty_cash_account,
        posting_date: ['<=', frm.doc.date || frappe.datetime.get_today()],
        is_cancelled: 0,
        docstatus: 1
    };
    
    frappe.route_options = filters;
    frappe.set_route('List', 'GL Entry');
}

// Function to print reconciliation
function print_reconciliation(frm) {
    if (!frm.doc.__islocal) {
        window.open(frappe.urllib.get_full_url('/printview?doctype=Petty%20Cash%20Reconciliation&name=' + frm.doc.name + '&format=Standard&no_letterhead=0'));
    }
}

// Function to show recent transactions
function show_recent_transactions(frm) {
    if (!frm.doc.petty_cash_account) {
        return;
    }
    
    frappe.call({
        method: 'frappe.db.get_all',
        args: {
            doctype: 'GL Entry',
            filters: {
                account: frm.doc.petty_cash_account,
                posting_date: ['<=', frm.doc.date || frappe.datetime.get_today()],
                is_cancelled: 0,
                docstatus: 1
            },
            fields: ['posting_date', 'voucher_type', 'voucher_no', 'debit', 'credit', 'against'],
            order_by: 'posting_date desc, creation desc',
            limit: 10
        },
        callback: function(r) {
            if (r.message && r.message.length > 0) {
                let html = '<div class="table-responsive"><table class="table table-bordered"><thead><tr>';
                html += '<th>Date</th><th>Voucher Type</th><th>Voucher No</th><th>Debit</th><th>Credit</th><th>Against</th>';
                html += '</tr></thead><tbody>';
                
                r.message.forEach(function(entry) {
                    html += '<tr>';
                    html += '<td>' + frappe.datetime.str_to_user(entry.posting_date) + '</td>';
                    html += '<td>' + entry.voucher_type + '</td>';
                    html += '<td><a href="#Form/' + entry.voucher_type + '/' + entry.voucher_no + '">' + entry.voucher_no + '</a></td>';
                    html += '<td>' + format_currency(entry.debit) + '</td>';
                    html += '<td>' + format_currency(entry.credit) + '</td>';
                    html += '<td>' + (entry.against || '') + '</td>';
                    html += '</tr>';
                });
                
                html += '</tbody></table></div>';
                
                frm.set_df_property('transactions_html', 'options', html);
            }
        }
    });
}

// Helper function to format currency
function format_currency(amount) {
    return frappe.format(amount, {fieldtype: 'Currency', options: frappe.boot.sysdefaults.currency});
}

// Custom method to get petty cash balance (server-side equivalent)
frappe.call({
    method: 'frappe.db.get_value',
    args: {
        doctype: 'Account',
        filters: {
            account_type: 'Cash',
            account_name: ['like', '%Petty Cash%']
        },
        fieldname: 'name'
    },
    callback: function(r) {
        if (r.message && r.message.name) {
            // Found petty cash account
            console.log('Default Petty Cash Account:', r.message.name);
        }
    }
});
