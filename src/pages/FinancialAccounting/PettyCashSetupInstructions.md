# Petty Cash Management Setup Instructions

Before using the Petty Cash Management module, please ensure the following master data is set up in your ERPNext instance:

## 1. Create Petty Cash Account
- Navigate to: `Accounting > Chart of Accounts`
- Create a new Account with the following details:
  - **Account Name:** Petty Cash
  - **Account Type:** Cash
  - **Currency:** INR (or your base currency)
  - **Is Group:** No
  - **Company:** Select your company

## 2. Create Petty Cash Cost Center
- Navigate to: `Accounting > Cost Center`
- Create a new Cost Center with:
  - **Cost Center Name:** Petty Cash
  - **Is Group:** No
  - **Company:** Select your company

## 3. Initial Funding Payment Entry
- Navigate to: `Accounting > Payment Entry`
- Create a new Payment Entry with:
  - **Payment Type:** Internal Transfer
  - **Paying Account:** Your main Bank Account
  - **Receiving Account:** Petty Cash (created in step 1)
  - **Amount:** Initial amount to fund petty cash
  - **Reference No.:** Initial Petty Cash Funding
  - **Cost Center:** Petty Cash (created in step 2)
- Submit the Payment Entry

## 4. Verify Setup
- Check that the Petty Cash account shows the funded amount
- Verify the GL Entry is created correctly
- Ensure the Petty Cash Cost Center is properly configured

These steps will set up the necessary financial accounts and cost centers for the Petty Cash Management module to function correctly.
