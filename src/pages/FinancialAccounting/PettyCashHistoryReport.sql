-- SQL Query for Petty Cash History Report
-- This query fetches all transactions related to Petty Cash accounts
-- Use this in a Standard Query Report in ERPNext

SELECT 
    gl.posting_date AS "Posting Date:Date:120",
    gl.account AS "Account:Link/Account:200",
    gl.debit AS "Debit:Currency:120",
    gl.credit AS "Credit:Currency:120",
    (gl.debit - gl.credit) AS "Net Amount:Currency:120",
    gl.voucher_type AS "Voucher Type:Data:150",
    gl.voucher_no AS "Voucher No:Data:150",
    gl.against AS "Against:Data:200",
    gl.cost_center AS "Cost Center:Link/Cost Center:150",
    gl.party_type AS "Party Type:Data:100",
    gl.party AS "Party:Dynamic Link:150",
    gl.remark AS "Remark:Text:300",
    gl.creation AS "Created On:Datetime:150",
    gl.modified_by AS "Modified By:Link/User:150",
    gl.company AS "Company:Link/Company:150"
FROM 
    `tabGL Entry` gl
WHERE 
    gl.account IN (
        SELECT name FROM `tabAccount` 
        WHERE account_type = 'Cash' 
        AND (
            account_name LIKE '%Petty Cash%' 
            OR account_name LIKE '%petty cash%'
            OR account_name LIKE '%PETTY CASH%'
        )
    )
    AND gl.is_cancelled = 0
    AND gl.docstatus = 1
    AND gl.posting_date IS NOT NULL
ORDER BY 
    gl.posting_date DESC, 
    gl.creation DESC;

-- Alternative query with date filter (if needed for reporting period)
SELECT 
    gl.posting_date AS "Posting Date:Date:120",
    gl.account AS "Account:Link/Account:200",
    gl.debit AS "Debit:Currency:120",
    gl.credit AS "Credit:Currency:120",
    (gl.debit - gl.credit) AS "Net Amount:Currency:120",
    gl.voucher_type AS "Voucher Type:Data:150",
    gl.voucher_no AS "Voucher No:Data:150",
    gl.against AS "Against:Data:200",
    gl.cost_center AS "Cost Center:Link/Cost Center:150",
    gl.party_type AS "Party Type:Data:100",
    gl.party AS "Party:Dynamic Link:150",
    gl.remark AS "Remark:Text:300",
    gl.creation AS "Created On:Datetime:150",
    gl.modified_by AS "Modified By:Link/User:150",
    gl.company AS "Company:Link/Company:150"
FROM 
    `tabGL Entry` gl
WHERE 
    gl.account IN (
        SELECT name FROM `tabAccount` 
        WHERE account_type = 'Cash' 
        AND (
            account_name LIKE '%Petty Cash%' 
            OR account_name LIKE '%petty cash%'
            OR account_name LIKE '%PETTY CASH%'
        )
    )
    AND gl.is_cancelled = 0
    AND gl.docstatus = 1
    AND gl.posting_date BETWEEN %(from_date)s AND %(to_date)s
ORDER BY 
    gl.posting_date DESC, 
    gl.creation DESC;

-- Query for Petty Cash Transaction specific records
SELECT 
    pct.transaction_date AS "Transaction Date:Date:120",
    pct.name AS "Transaction ID:Link/Petty Cash Transaction:150",
    pct.type AS "Type:Data:100",
    pct.amount AS "Amount:Currency:120",
    pct.description AS "Description:Text:300",
    pct.employee AS "Employee:Link/Employee:150",
    pct.expense_account AS "Expense Account:Link/Account:200",
    pct.petty_cash_account AS "Petty Cash Account:Link/Account:200",
    pct.status AS "Status:Data:100",
    pct.creation AS "Created On:Datetime:150",
    pct.owner AS "Created By:Link/User:150",
    pct.company AS "Company:Link/Company:150"
FROM 
    `tabPetty Cash Transaction` pct
WHERE 
    pct.docstatus = 1
    AND pct.transaction_date IS NOT NULL
ORDER BY 
    pct.transaction_date DESC, 
    pct.creation DESC;

-- Combined Query for comprehensive Petty Cash History
SELECT 
    COALESCE(gl.posting_date, pct.transaction_date) AS "Date:Date:120",
    COALESCE(gl.voucher_no, pct.name) AS "Reference:Data:150",
    COALESCE(gl.voucher_type, 'Petty Cash Transaction') AS "Type:Data:150",
    COALESCE(gl.account, pct.petty_cash_account) AS "Account:Link/Account:200",
    COALESCE(gl.debit, CASE WHEN pct.type IN ('Fund Addition') THEN pct.amount ELSE 0 END) AS "Debit:Currency:120",
    COALESCE(gl.credit, CASE WHEN pct.type = 'Expense' THEN pct.amount ELSE 0 END) AS "Credit:Currency:120",
    COALESCE(gl.remark, pct.description) AS "Description:Text:300",
    COALESCE(gl.party, pct.employee) AS "Party:Dynamic Link:150",
    COALESCE(gl.cost_center, 'Petty Cash') AS "Cost Center:Link/Cost Center:150",
    COALESCE(gl.company, pct.company) AS "Company:Link/Company:150"
FROM 
    `tabGL Entry` gl
FULL OUTER JOIN 
    `tabPetty Cash Transaction` pct ON gl.voucher_no = pct.name
WHERE 
    (gl.account IN (
        SELECT name FROM `tabAccount` 
        WHERE account_type = 'Cash' 
        AND (
            account_name LIKE '%Petty Cash%' 
            OR account_name LIKE '%petty cash%'
            OR account_name LIKE '%PETTY CASH%'
        )
    ) OR pct.name IS NOT NULL)
    AND COALESCE(gl.is_cancelled, 0) = 0
    AND COALESCE(gl.docstatus, pct.docstatus) = 1
    AND COALESCE(gl.posting_date, pct.transaction_date) IS NOT NULL
ORDER BY 
    COALESCE(gl.posting_date, pct.transaction_date) DESC, 
    COALESCE(gl.creation, pct.creation) DESC;
