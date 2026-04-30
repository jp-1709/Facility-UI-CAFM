# Python Server Script for Petty Cash Transaction
# This script handles the on_submit event for Petty Cash Transaction DocType

import frappe
from frappe.model.document import Document
from frappe.utils import flt, getdate, today

class PettyCashTransaction(Document):
    def validate(self):
        """Validate the document before submission"""
        # Validate date
        if getdate(self.transaction_date) > getdate(today()):
            frappe.throw("Transaction Date cannot be in the future")
        
        # Validate amount
        if flt(self.amount) <= 0:
            frappe.throw("Amount must be greater than zero")
        
        # Validate expense account for expense transactions
        if self.type == "Expense" and not self.expense_account:
            frappe.throw("Expense Account is required for Expense transactions")
    
    def on_submit(self):
        """Handle document submission"""
        if self.type == "Expense":
            self._create_expense_journal_entry()
        elif self.type == "Fund Addition":
            self._create_fund_addition_journal_entry()
        elif self.type == "Adjustment":
            self._create_adjustment_journal_entry()
    
    def on_cancel(self):
        """Handle document cancellation"""
        # Cancel the linked Journal Entry if exists
        if hasattr(self, 'journal_entry') and self.journal_entry:
            try:
                je = frappe.get_doc("Journal Entry", self.journal_entry)
                if je.docstatus == 1:
                    je.cancel()
                    frappe.msgprint(f"Journal Entry {je.name} cancelled")
            except frappe.DoesNotExistError:
                pass
    
    def _create_expense_journal_entry(self):
        """Create Journal Entry for Expense transactions"""
        try:
            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = self.transaction_date
            je.company = self.company
            je.remark = f"Petty Cash Expense: {self.description}"
            je.user_remark = f"Petty Cash Transaction: {self.name}"
            
            # Debit Expense Account
            je.append("accounts", {
                "account": self.expense_account,
                "debit_in_account_currency": flt(self.amount),
                "credit_in_account_currency": 0,
                "cost_center": self.cost_center,
                "party_type": "Employee" if self.employee else None,
                "party": self.employee if self.employee else None,
                "reference_type": "Petty Cash Transaction",
                "reference_name": self.name
            })
            
            # Credit Petty Cash Account
            je.append("accounts", {
                "account": self.petty_cash_account,
                "debit_in_account_currency": 0,
                "credit_in_account_currency": flt(self.amount),
                "cost_center": self.cost_center,
                "reference_type": "Petty Cash Transaction",
                "reference_name": self.name
            })
            
            je.insert()
            je.submit()
            
            # Store the Journal Entry reference
            self.db_set("journal_entry", je.name)
            
            frappe.msgprint(f"Journal Entry {je.name} created and submitted for Petty Cash Expense")
            
        except Exception as e:
            frappe.throw(f"Error creating Journal Entry: {str(e)}")
    
    def _create_fund_addition_journal_entry(self):
        """Create Journal Entry for Fund Addition transactions"""
        try:
            # For Fund Addition, we typically use Payment Entry
            # But if JE is required, debit Petty Cash and credit Bank/Cash
            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = self.transaction_date
            je.company = self.company
            je.remark = f"Petty Cash Fund Addition: {self.description}"
            je.user_remark = f"Petty Cash Transaction: {self.name}"
            
            # Debit Petty Cash Account
            je.append("accounts", {
                "account": self.petty_cash_account,
                "debit_in_account_currency": flt(self.amount),
                "credit_in_account_currency": 0,
                "cost_center": self.cost_center,
                "reference_type": "Petty Cash Transaction",
                "reference_name": self.name
            })
            
            # Credit Bank Account (assuming default bank account)
            default_bank_account = frappe.db.get_value("Company", self.company, "default_bank_account")
            if not default_bank_account:
                frappe.throw("Default Bank Account not configured for the company")
            
            je.append("accounts", {
                "account": default_bank_account,
                "debit_in_account_currency": 0,
                "credit_in_account_currency": flt(self.amount),
                "cost_center": self.cost_center,
                "reference_type": "Petty Cash Transaction",
                "reference_name": self.name
            })
            
            je.insert()
            je.submit()
            
            # Store the Journal Entry reference
            self.db_set("journal_entry", je.name)
            
            frappe.msgprint(f"Journal Entry {je.name} created and submitted for Fund Addition")
            
        except Exception as e:
            frappe.throw(f"Error creating Journal Entry: {str(e)}")
    
    def _create_adjustment_journal_entry(self):
        """Create Journal Entry for Adjustment transactions"""
        try:
            je = frappe.new_doc("Journal Entry")
            je.voucher_type = "Journal Entry"
            je.posting_date = self.transaction_date
            je.company = self.company
            je.remark = f"Petty Cash Adjustment: {self.description}"
            je.user_remark = f"Petty Cash Transaction: {self.name}"
            
            # For adjustments, we need to determine the accounts based on the adjustment type
            # This is a simplified version - you might need to enhance based on specific requirements
            
            # If it's a positive adjustment (adding to petty cash)
            if flt(self.amount) > 0:
                # Debit Petty Cash
                je.append("accounts", {
                    "account": self.petty_cash_account,
                    "debit_in_account_currency": flt(self.amount),
                    "credit_in_account_currency": 0,
                    "cost_center": self.cost_center,
                    "reference_type": "Petty Cash Transaction",
                    "reference_name": self.name
                })
                
                # Credit Adjustment Account (you might need to create this account)
                adjustment_account = frappe.db.get_value("Company", self.company, "round_off_account") or "Income From Other Sources"
                je.append("accounts", {
                    "account": adjustment_account,
                    "debit_in_account_currency": 0,
                    "credit_in_account_currency": flt(self.amount),
                    "cost_center": self.cost_center,
                    "reference_type": "Petty Cash Transaction",
                    "reference_name": self.name
                })
            else:
                # Negative adjustment (removing from petty cash)
                # Debit Adjustment Account
                adjustment_account = frappe.db.get_value("Company", self.company, "round_off_account") or "Income From Other Sources"
                je.append("accounts", {
                    "account": adjustment_account,
                    "debit_in_account_currency": abs(flt(self.amount)),
                    "credit_in_account_currency": 0,
                    "cost_center": self.cost_center,
                    "reference_type": "Petty Cash Transaction",
                    "reference_name": self.name
                })
                
                # Credit Petty Cash
                je.append("accounts", {
                    "account": self.petty_cash_account,
                    "debit_in_account_currency": 0,
                    "credit_in_account_currency": abs(flt(self.amount)),
                    "cost_center": self.cost_center,
                    "reference_type": "Petty Cash Transaction",
                    "reference_name": self.name
                })
            
            je.insert()
            je.submit()
            
            # Store the Journal Entry reference
            self.db_set("journal_entry", je.name)
            
            frappe.msgprint(f"Journal Entry {je.name} created and submitted for Adjustment")
            
        except Exception as e:
            frappe.throw(f"Error creating Journal Entry: {str(e)}")

# Custom method to get petty cash balance
@frappe.whitelist()
def get_petty_cash_balance(account=None):
    """Get current balance of petty cash account"""
    if not account:
        # Get default petty cash account
        account = frappe.db.get_value("Account", {"account_type": "Cash", "account_name": ["like", "%Petty Cash%"]})
    
    if not account:
        return 0
    
    # Get balance from GL Entry
    balance = frappe.db.sql("""
        SELECT 
            SUM(debit) - SUM(credit) as balance
        FROM `tabGL Entry`
        WHERE account = %s
        AND is_cancelled = 0
        AND docstatus = 1
    """, account, as_dict=True)
    
    return flt(balance[0].balance) if balance else 0
