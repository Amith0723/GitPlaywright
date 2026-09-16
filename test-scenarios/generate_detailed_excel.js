const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

// 1. All Test Scenarios Detailed
const allDetailedScenarios = [
  // --- 1. Bookingview.spec.js ---
  {
    "Test Scenario ID": "TS_BV_001",
    "File Name": "Bookingview.spec.js",
    "Module": "Bookings Management",
    "Test Scenario Title": "Verify Business Login & Navigation to Bookings",
    "Preconditions": "Valid business owner credentials exist",
    "Test Steps": "1. Navigate to https://devbiz.zylu.co/\n2. Fill valid email & password\n3. Click Sign In button\n4. Confirm redirect to /#/home\n5. Click Bookings from sidebar or navigate to /#/bookings",
    "Test Data": "Email: test_automation_owner@zylu.co\nPassword: valid_password\nURL: /#/bookings",
    "Expected Result": "User is authenticated and lands on Bookings management screen (/#/bookings)",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_002",
    "File Name": "Bookingview.spec.js",
    "Module": "Bookings Management",
    "Test Scenario Title": "Verify Toggle from Calendar View to List View",
    "Preconditions": "User is on Bookings screen",
    "Test Steps": "1. Inspect current view mode toggle button\n2. If button displays 'List View', click it\n3. Wait for booking table rows to render",
    "Test Data": "Toggle Button: 'List View'",
    "Expected Result": "Screen switches to tabular List View displaying all booking rows with columns",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_003",
    "File Name": "Bookingview.spec.js",
    "Module": "Bookings Management",
    "Test Scenario Title": "Verify Booking List Row Data Attributes",
    "Preconditions": "At least one booking row exists in List View",
    "Test Steps": "1. Locate target booking row\n2. Extract Booking ID, Date & Time, Customer Name, Staff Name, Status, and Total Amount\n3. Validate format of each extracted attribute",
    "Test Data": "Extracted Row Attributes (ID: #8440, Customer: Customer_5512, Status: Completed, Amount: ₹150.00)",
    "Expected Result": "All booking row attributes are present, non-empty, and properly formatted",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_004",
    "File Name": "Bookingview.spec.js",
    "Module": "Bookings Management",
    "Test Scenario Title": "Verify Three-Dot (Show Menu) Action Popup Options",
    "Preconditions": "Booking rows rendered in List View",
    "Test Steps": "1. Click the three dots ('Show menu') button on target row\n2. Verify popup menu appears\n3. Verify presence of: View Details, Generate Invoice, Share, Copy Booking, Add Todo",
    "Test Data": "Target: button 'Show menu'",
    "Expected Result": "Popup menu opens displaying all standard booking actions enabled for interaction",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_005",
    "File Name": "Bookingview.spec.js",
    "Module": "Bookings Management",
    "Test Scenario Title": "Verify View Details Dialog Open & Header Info",
    "Preconditions": "Three-dot popup menu is open",
    "Test Steps": "1. Click 'View Details' menu item\n2. Wait for Booking details dialog to display\n3. Verify dialog heading 'Booking'\n4. Verify Store Name and branch address",
    "Test Data": "Menu item: 'View Details'\nStore: The Comfort Zone Spa - Org1 /Premium",
    "Expected Result": "Booking details dialog opens displaying modal title 'Booking' and correct store branding",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_006",
    "File Name": "Bookingview.spec.js",
    "Module": "Bookings Management",
    "Test Scenario Title": "Verify Data Consistency Between List Row & Details Screen",
    "Preconditions": "Booking details dialog is open",
    "Test Steps": "1. Intercept booking API response (/api/bookings/{id})\n2. Validate Booking ID matches list row\n3. Validate Customer Name matches list row\n4. Validate Status matches list row\n5. Validate Staff Name matches list row",
    "Test Data": "Booking ID: #8440\nCustomer: Customer_5512\nStatus: Completed",
    "Expected Result": "All data fields displayed in the details dialog match the selected list view row exactly",
    "Automation Status": "Automated (Passing)"
  },

  // --- 2. package_redeem.spec.js ---
  {
    "Test Scenario ID": "TS_PR_001",
    "File Name": "package_redeem.spec.js",
    "Module": "Package Redemption",
    "Test Scenario Title": "Verify Customer Search with Result Validation & Incomplete Booking Check",
    "Preconditions": "User logged in on New Sale > Booking tab",
    "Test Steps": "1. Open New Sale > Booking tab\n2. Enter search queries ('r', 's', 'm', 'a') until ≥3 customer options appear\n3. Select customer at index 2 (3rd customer)\n4. If 'Incomplete Bookings' modal appears, dismiss it",
    "Test Data": "Queries: ['r', 's', 'm', 'a']\nIndex: 2",
    "Expected Result": "Customer is selected and attached to sale; incomplete booking dialog is dismissed cleanly",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PR_002",
    "File Name": "package_redeem.spec.js",
    "Module": "Package Redemption",
    "Test Scenario Title": "Verify '+ Package' Modal & Package Selection",
    "Preconditions": "Customer attached to current sale",
    "Test Steps": "1. Click '+ Package' button\n2. Verify package selection modal opens\n3. Search and select package containing 'Personalized' or 'Standard' (or fallback first available)\n4. Check package checkbox and click Apply",
    "Test Data": "Package Filter: 'Personalized' | 'Standard'",
    "Expected Result": "Selected package services are added as line items to the booking summary table",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PR_003",
    "File Name": "package_redeem.spec.js",
    "Module": "Package Redemption",
    "Test Scenario Title": "Verify Unique Staff Assignment Per Service Row in Package",
    "Preconditions": "Package line items added to sale",
    "Test Steps": "1. Detect all unassigned service rows ('Select Staff')\n2. For each row, open staff dropdown\n3. Assign a distinct staff member not previously used in this booking\n4. Verify each row has a valid staff member assigned",
    "Test Data": "Staff Pool: ['audi by rohan', 'Dhruv Salat', 'Dummy employee']",
    "Expected Result": "Every service row in the package has a unique assigned staff member",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PR_004",
    "File Name": "package_redeem.spec.js",
    "Module": "Package Redemption",
    "Test Scenario Title": "Verify Package Sale Checkout, Online Payment & Invoice Generation",
    "Preconditions": "Package added with assigned staff",
    "Test Steps": "1. Click Checkout button\n2. Review payment breakdown\n3. Select payment method as 'Online'\n4. Click Complete Payment\n5. Verify redirection to Generate Invoice screen\n6. Validate invoice number and payment status 'Paid'",
    "Test Data": "Payment Method: Online",
    "Expected Result": "Sale completes, payment status is 'Paid', and invoice is generated with unique invoice ID",
    "Automation Status": "Automated (Passing)"
  },

  // --- 3. membershipredeem.spec.js ---
  {
    "Test Scenario ID": "TS_MR_001",
    "File Name": "membershipredeem.spec.js",
    "Module": "Membership Redemption",
    "Test Scenario Title": "Verify '+ Membership' Modal & Active Membership Selection",
    "Preconditions": "User on New Sale > Booking tab with customer selected",
    "Test Steps": "1. Search and select customer\n2. Dismiss incomplete bookings modal if present\n3. Click '+ Membership' button\n4. Confirm membership catalog modal opens\n5. Select first available active membership\n6. Click Apply",
    "Test Data": "Membership: Active catalog membership",
    "Expected Result": "Membership is applied to customer booking and line item discounts are activated",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_MR_002",
    "File Name": "membershipredeem.spec.js",
    "Module": "Membership Redemption",
    "Test Scenario Title": "Verify Membership Redemption Checkout & Discount Calculation",
    "Preconditions": "Membership added to sale",
    "Test Steps": "1. Assign distinct staff members to each service row\n2. Click Checkout button\n3. Verify membership discount is deducted from total payable\n4. Choose 'Online' payment and complete\n5. Verify invoice confirms membership redemption",
    "Test Data": "Payment: Online",
    "Expected Result": "Transaction is processed with membership discount applied, and invoice is finalized",
    "Automation Status": "Automated (Passing)"
  },

  // --- 4. couponsreedem.spec.js ---
  {
    "Test Scenario ID": "TS_CP_001",
    "File Name": "couponsreedem.spec.js",
    "Module": "Coupons & Discounts",
    "Test Scenario Title": "Verify Dynamic Coupon Creation in Management Portal",
    "Preconditions": "User logged in with business owner privileges",
    "Test Steps": "1. Scroll sidebar and click 'Manage'\n2. Click 'Coupons' option card\n3. Click '+' (Add Coupon) button\n4. Fill unique Coupon Code (AUTOTEST_<timestamp>)\n5. Fill Description, Discount Type (Percentage/Flat), Value, and Validity Date\n6. Click Save",
    "Test Data": "Code: AUTOTEST_<timestamp>\nType: Flat Discount\nValue: ₹50.00",
    "Expected Result": "Coupon is successfully created, saved, and listed in active coupons directory",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_CP_002",
    "File Name": "couponsreedem.spec.js",
    "Module": "Coupons & Discounts",
    "Test Scenario Title": "Verify Coupon Code Application & Discount Verification at Checkout",
    "Preconditions": "Coupon created, active sale in progress",
    "Test Steps": "1. Navigate to New Sale > Booking tab\n2. Select customer and add services\n3. Proceed to checkout\n4. Enter newly created coupon code in coupon field\n5. Click Apply\n6. Verify total amount is recalculated correctly\n7. Complete payment and verify invoice matches discounted total",
    "Test Data": "Coupon Code: AUTOTEST_<timestamp>\nPayment Method: Cash / Online",
    "Expected Result": "Coupon applies successfully, payment due is reduced by discount value, and invoice reflects coupon savings",
    "Automation Status": "Automated (Passing)"
  },

  // --- 5. product_checkout.spec.js ---
  {
    "Test Scenario ID": "TS_PC_001",
    "File Name": "product_checkout.spec.js",
    "Module": "Product Sales",
    "Test Scenario Title": "Verify Random In-Stock Product Selection from Catalog Modal",
    "Preconditions": "Catalog contains active retail products",
    "Test Steps": "1. Open New Sale > Booking tab\n2. Select customer\n3. Click '+ Product' button\n4. Retrieve all in-stock products (filtering out Stock: 0)\n5. Pick a random in-stock product from the list\n6. Select checkbox and click Apply",
    "Test Data": "Product Filter: Stock > 0\nSelection: Math.random()",
    "Expected Result": "Product modal displays available items; selected random product is added to sale summary",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PC_002",
    "File Name": "product_checkout.spec.js",
    "Module": "Product Sales",
    "Test Scenario Title": "Verify Staff Assignment, Appointment Notes & Product Checkout",
    "Preconditions": "Product line item added to sale",
    "Test Steps": "1. Assign a dedicated staff member to the product for commission\n2. Enter appointment / sale notes in notes field\n3. Click Checkout\n4. Confirm payment method and complete transaction\n5. Assert invoice reflects sold product name, quantity, price, and staff",
    "Test Data": "Notes: 'Automated test product sale'\nStaff: audi by rohan",
    "Expected Result": "Product checkout completes successfully; invoice displays itemized product sale",
    "Automation Status": "Automated (Passing)"
  },

  // --- 6. cust_checkout.spec.js ---
  {
    "Test Scenario ID": "TS_CC_001",
    "File Name": "cust_checkout.spec.js",
    "Module": "Customer Checkout",
    "Test Scenario Title": "Verify Existing Customer Selection & Service Checkout Flow",
    "Preconditions": "Registered customers exist in business database",
    "Test Steps": "1. Open New Sale > Booking tab\n2. Search customer by character query\n3. Select matching customer\n4. Add multiple services to booking\n5. Assign staff members to each service\n6. Proceed to checkout and complete payment",
    "Test Data": "Customer Query: 'r'\nServices: Multiple services\nPayment: Cash",
    "Expected Result": "Sale completes without error; invoice is issued and linked to customer profile",
    "Automation Status": "Automated (Passing)"
  },

  // --- 7. newcustomere2e.spec.js ---
  {
    "Test Scenario ID": "TS_NC_001",
    "File Name": "newcustomere2e.spec.js",
    "Module": "Customer Management",
    "Test Scenario Title": "Verify Dynamic New Customer Registration via '+ New' Modal",
    "Preconditions": "User on New Sale screen",
    "Test Steps": "1. Click '+ New Customer' button\n2. Fill Full Name (Customer_<rand>)\n3. Fill valid Phone Number (9XXXXXXXXX)\n4. Select Gender (Male/Female)\n5. Fill Email Address\n6. Click Save Customer",
    "Test Data": "Name: Customer_<rand>\nPhone: 9XXXXXXXXX\nEmail: cust_<timestamp>@test.com",
    "Expected Result": "New customer is saved, auto-selected on the sale form, and added to customer database",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_NC_002",
    "File Name": "newcustomere2e.spec.js",
    "Module": "Customer Management",
    "Test Scenario Title": "Verify First Sale Completion & Invoice Generation for New Customer",
    "Preconditions": "New customer registered and active on sale form",
    "Test Steps": "1. Add services to booking\n2. Assign staff member\n3. Click Checkout\n4. Select payment method\n5. Click Complete Payment\n6. Verify Invoice is generated with new customer's details",
    "Test Data": "Payment: Online / Cash",
    "Expected Result": "Invoice is successfully generated with customer name, phone number, and transaction receipt",
    "Automation Status": "Automated (Passing)"
  },

  // --- 8. incomplete_booking.spec.js ---
  {
    "Test Scenario ID": "TS_IB_001",
    "File Name": "incomplete_booking.spec.js",
    "Module": "Incomplete Bookings",
    "Test Scenario Title": "Verify Detection of Incomplete Bookings on Customer Selection",
    "Preconditions": "Customer has an existing draft/incomplete booking",
    "Test Steps": "1. Open New Sale > Booking tab\n2. Search and select customer with incomplete booking\n3. Detect if 'Incomplete Bookings' modal pops up automatically or indicator displays count (N)\n4. Verify modal displays incomplete booking details (Date, Services, Amount)",
    "Test Data": "Customer: Customer with draft booking history",
    "Expected Result": "System identifies open draft bookings and presents prompt to prevent duplicate entries",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_IB_002",
    "File Name": "incomplete_booking.spec.js",
    "Module": "Incomplete Bookings",
    "Test Scenario Title": "Verify Dismissing or Continuing Incomplete Booking Flow",
    "Preconditions": "Incomplete booking prompt active",
    "Test Steps": "1. If modal appears, click 'Continue' to resume draft OR click close/dismiss to start fresh\n2. Verify sale form updates accordingly without locking the UI\n3. Proceed to add product/service and complete checkout",
    "Test Data": "Action: Dismiss or Continue",
    "Expected Result": "User can seamlessly navigate through incomplete booking dialog without UI deadlock",
    "Automation Status": "Automated (Passing)"
  },

  // --- 9. guest_walkin_checkE_E.spec.js ---
  {
    "Test Scenario ID": "TS_GW_001",
    "File Name": "guest_walkin_checkE_E.spec.js",
    "Module": "Guest Walk-in",
    "Test Scenario Title": "Verify Walk-in Customer Selection with Calendar Date Picker",
    "Preconditions": "User logged in on business dashboard",
    "Test Steps": "1. Launch New Sale flow\n2. Select 'Walk-in' / Guest mode\n3. Open calendar date picker\n4. Pick specific target day of month (e.g. today or future date)\n5. Confirm calendar selection updates date display",
    "Test Data": "Mode: Walk-in\nTarget Date: Day of month",
    "Expected Result": "Walk-in mode is active and booking date is accurately selected from calendar",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_GW_002",
    "File Name": "guest_walkin_checkE_E.spec.js",
    "Module": "Guest Walk-in",
    "Test Scenario Title": "Verify Rapid Service Selection & Cash Checkout for Walk-in Guest",
    "Preconditions": "Walk-in customer mode active",
    "Test Steps": "1. Add walk-in service\n2. Assign available performing staff\n3. Proceed directly to checkout\n4. Select Cash payment\n5. Complete sale and print/view invoice",
    "Test Data": "Payment: Cash",
    "Expected Result": "Quick walk-in transaction finishes in under 30 seconds with valid invoice",
    "Automation Status": "Automated (Passing)"
  },

  // --- 10. Dailyrevnue.spec.ts ---
  {
    "Test Scenario ID": "TS_DR_001",
    "File Name": "Dailyrevnue.spec.ts",
    "Module": "Reports & Analytics",
    "Test Scenario Title": "Verify Daily Revenue Report Navigation & Default Date Display",
    "Preconditions": "Sales completed for today",
    "Test Steps": "1. Navigate to Reports screen (/#/reports)\n2. Click 'Daily Revenue' report card\n3. Wait for report table and metric cards to load\n4. Verify current date is selected by default",
    "Test Data": "Report: Daily Revenue\nURL: /#/reports",
    "Expected Result": "Daily Revenue dashboard loads showing today's revenue totals, tips, and collections",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_DR_002",
    "File Name": "Dailyrevnue.spec.ts",
    "Module": "Reports & Analytics",
    "Test Scenario Title": "Verify Date Range Filtering & Metric Card Recalculation",
    "Preconditions": "Daily revenue report open",
    "Test Steps": "1. Open date range dropdown filter\n2. Select custom date range (e.g. Last 7 Days / Month to Date)\n3. Click Apply Filter\n4. Verify summary cards update: Total Revenue, Cash Collected, Card, Online, Tips, Balance",
    "Test Data": "Date Range: Custom Date Filter",
    "Expected Result": "All metric cards and table rows recalculate to reflect the selected date range",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_DR_003",
    "File Name": "Dailyrevnue.spec.ts",
    "Module": "Reports & Analytics",
    "Test Scenario Title": "Verify Daily Revenue Summary Table Row Total Consistency",
    "Preconditions": "Report data rendered",
    "Test Steps": "1. Locate 'Total' summary row at bottom of table\n2. Sum individual line items across columns\n3. Verify mathematical match with 'Total' row values\n4. Verify export/download report functionality",
    "Test Data": "Comparison: Sum of columns vs Total row",
    "Expected Result": "Total row matches the sum of columns; report download generates valid export file",
    "Automation Status": "Automated (Passing)"
  },

  // --- 11. staff_commission.spec.ts ---
  {
    "Test Scenario ID": "TS_SC_001",
    "File Name": "staff_commission.spec.ts",
    "Module": "Staff Management",
    "Test Scenario Title": "Verify Staff Commission Report Navigation via Performance Category",
    "Preconditions": "User logged in with manager/owner credentials",
    "Test Steps": "1. Navigate to Reports screen\n2. Click 'Staff Performance' category\n3. Click 'Staff Commission' report card\n4. Wait for commission breakdown table to load",
    "Test Data": "Category: Staff Performance\nReport: Staff Commission",
    "Expected Result": "Staff Commission report loads displaying all active employees and commission structures",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_SC_002",
    "File Name": "staff_commission.spec.ts",
    "Module": "Staff Management",
    "Test Scenario Title": "Verify Staff Commission Calculation Across Employees and Date Ranges",
    "Preconditions": "Staff Commission report active",
    "Test Steps": "1. Filter by specific employee (e.g. 'Dhruv Salat' or 'All Employees')\n2. Select date range\n3. Verify Service Commission, Product Commission, and Total Commission columns\n4. Validate commission tier percentages against configured business rules",
    "Test Data": "Employee: Dhruv Salat\nCommission Rules: e.g. 10% on services",
    "Expected Result": "Earned commissions match sales revenue multiplied by configured commission rate",
    "Automation Status": "Automated (Passing)"
  },

  // --- 12. staffsummary.spec.js ---
  {
    "Test Scenario ID": "TS_SS_001",
    "File Name": "staffsummary.spec.js",
    "Module": "Staff Management",
    "Test Scenario Title": "Verify Staff Summary Report Navigation & Sales Overview",
    "Preconditions": "Staff members have recorded sales",
    "Test Steps": "1. Navigate to Reports screen\n2. Click 'Staff Performance' category\n3. Click 'Staff Summary' report card\n4. Verify employee list displays services count, product count, memberships, and total bookings",
    "Test Data": "Report: Staff Summary",
    "Expected Result": "Staff Summary table renders employee sales breakdown across all categories",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_SS_002",
    "File Name": "staffsummary.spec.js",
    "Module": "Staff Management",
    "Test Scenario Title": "Verify Employee Sales Filter by Date and Category",
    "Preconditions": "Staff summary report active",
    "Test Steps": "1. Filter by employee dropdown\n2. Filter by date range\n3. Verify individual totals match completed appointments for that employee",
    "Test Data": "Employee filter: Target staff member",
    "Expected Result": "Filtered view accurately reflects only bookings performed by the selected staff member",
    "Automation Status": "Automated (Passing)"
  },

  // --- 13. tip.spec.js ---
  {
    "Test Scenario ID": "TS_TP_001",
    "File Name": "tip.spec.js",
    "Module": "Payment & Tips",
    "Test Scenario Title": "Verify Adding Tip Amount to Specific Staff Member During Checkout",
    "Preconditions": "Active booking with assigned staff ready for checkout",
    "Test Steps": "1. Open New Sale > Booking tab\n2. Select customer and assign two distinct staff members (Row 1: audi by rohan, Row 2: Dhruv Salat)\n3. Proceed to checkout\n4. In payment screen, locate Tip field\n5. Enter Tip amount (e.g. ₹50.00)\n6. Select staff member to allocate tip to",
    "Test Data": "Tip: ₹50.00\nAllocated Staff: Dhruv Salat",
    "Expected Result": "Tip is added to total payment due and allocated to the designated staff member",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_TP_002",
    "File Name": "tip.spec.js",
    "Module": "Payment & Tips",
    "Test Scenario Title": "Verify Payment Due Recalculation & Invoice Representation of Tip",
    "Preconditions": "Tip entered on checkout screen",
    "Test Steps": "1. Verify Total Payment Due = Service Amount + Tip Amount\n2. Select Payment Method and click Complete\n3. Review generated invoice\n4. Assert tip is itemized as a distinct line item on invoice",
    "Test Data": "Total = Services + ₹50.00 tip",
    "Expected Result": "Payment completes with total including tip; invoice displays tip line item and assigned staff",
    "Automation Status": "Automated (Passing)"
  },

  // --- 14. login-booking.spec.js ---
  {
    "Test Scenario ID": "TS_LB_001",
    "File Name": "login-booking.spec.js",
    "Module": "Authentication & Launch",
    "Test Scenario Title": "Verify Login Flow & Quick Launch of New Sale Modal",
    "Preconditions": "Valid credentials",
    "Test Steps": "1. Navigate to https://devbiz.zylu.co/\n2. Enter Email and Password\n3. Click Sign In\n4. On Home screen, click 'New Sale' button\n5. Verify New Sale dialog opens",
    "Test Data": "Credentials: test_automation_owner@zylu.co",
    "Expected Result": "Login succeeds and New Sale modal opens ready for booking/product entry",
    "Automation Status": "Automated (Passing)"
  },

  // --- 15. market_cust.spec.js ---
  {
    "Test Scenario ID": "TS_MC_001",
    "File Name": "market_cust.spec.js",
    "Module": "Marketing & CRM",
    "Test Scenario Title": "Verify Adding Customer via Marketing Module",
    "Preconditions": "User logged in on business dashboard",
    "Test Steps": "1. Navigate to Marketing module from sidebar\n2. Open Customers subsection\n3. Click Add Customer button\n4. Fill customer details and save\n5. Verify customer appears in marketing list",
    "Test Data": "Customer Name, Phone Number, Marketing opt-in",
    "Expected Result": "Customer profile is created and linked into marketing campaign audience",
    "Automation Status": "Automated (Passing)"
  }
];

// 2. Booking View Detailed Scenarios
const bookingviewScenarios = allDetailedScenarios.filter(s => s["File Name"] === "Bookingview.spec.js");

// 3. Sales & Redemptions Scenarios
const salesRedemptionsScenarios = allDetailedScenarios.filter(s => 
  ["package_redeem.spec.js", "membershipredeem.spec.js", "couponsreedem.spec.js", "product_checkout.spec.js", "cust_checkout.spec.js", "newcustomere2e.spec.js", "incomplete_booking.spec.js", "guest_walkin_checkE_E.spec.js", "tip.spec.js", "login-booking.spec.js"].includes(s["File Name"])
);

// 4. Reports & Analytics Scenarios
const reportsScenarios = allDetailedScenarios.filter(s => 
  ["Dailyrevnue.spec.ts", "staff_commission.spec.ts", "staffsummary.spec.js"].includes(s["File Name"])
);

// 5. Automation Coverage Matrix Summary
const coverageMatrix = [
  { "Spec File": "Bookingview.spec.js", "Module": "Bookings Management", "Total Scenarios": 6, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "List view, three dots menu, view details, API & UI assertion" },
  { "Spec File": "package_redeem.spec.js", "Module": "Package Redemption", "Total Scenarios": 4, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Customer search, package selection, unique staff, online payment" },
  { "Spec File": "membershipredeem.spec.js", "Module": "Membership Redemption", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Membership catalog, discount calculation, staff allocation" },
  { "Spec File": "couponsreedem.spec.js", "Module": "Coupons & Discounts", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Dynamic coupon creation in Manage, New Sale redemption, invoice validation" },
  { "Spec File": "product_checkout.spec.js", "Module": "Product Sales", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Random in-stock product selection, staff assignment, notes, checkout" },
  { "Spec File": "cust_checkout.spec.js", "Module": "Customer Checkout", "Total Scenarios": 1, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Customer search by query, service selection, checkout" },
  { "Spec File": "newcustomere2e.spec.js", "Module": "Customer Management", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "+ New Customer modal, dynamic data generation, sale creation" },
  { "Spec File": "incomplete_booking.spec.js", "Module": "Incomplete Bookings", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Incomplete booking prompt detection, continue/dismiss, product flow" },
  { "Spec File": "guest_walkin_checkE_E.spec.js", "Module": "Guest Walk-in", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Walk-in mode, calendar day picker, quick cash checkout" },
  { "Spec File": "Dailyrevnue.spec.ts", "Module": "Reports & Analytics", "Total Scenarios": 3, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Daily revenue metrics, date range calendar picker, total row math" },
  { "Spec File": "staff_commission.spec.ts", "Module": "Staff Management", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Staff commission calculation, employee filter, date range filter" },
  { "Spec File": "staffsummary.spec.js", "Module": "Staff Management", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Staff summary breakdown by service, product, membership" },
  { "Spec File": "tip.spec.js", "Module": "Payment & Tips", "Total Scenarios": 2, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Tip addition, staff tip allocation, invoice line item verification" },
  { "Spec File": "login-booking.spec.js", "Module": "Authentication & Launch", "Total Scenarios": 1, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Login authentication, New Sale launcher" },
  { "Spec File": "market_cust.spec.js", "Module": "Marketing & CRM", "Total Scenarios": 1, "Execution Type": "Playwright / Chromium", "Passing Status": "100% Passed", "Key Flow": "Add customer in marketing module" }
];

// Column auto-fit function
function fitCols(data) {
  if (!data || data.length === 0) return [];
  const keys = Object.keys(data[0]);
  return keys.map(key => {
    let maxLen = key.length;
    for (const row of data) {
      const val = row[key] ? String(row[key]) : '';
      const lines = val.split('\n');
      for (const line of lines) {
        if (line.length > maxLen) maxLen = line.length;
      }
    }
    return { wch: Math.min(Math.max(maxLen + 4, 12), 65) };
  });
}

const wb = XLSX.utils.book_new();

// Sheet 1: All Test Scenarios Detailed
const ws1 = XLSX.utils.json_to_sheet(allDetailedScenarios);
ws1['!cols'] = fitCols(allDetailedScenarios);
XLSX.utils.book_append_sheet(wb, ws1, 'All_Files_Detailed');

// Sheet 2: Booking View Detailed
const ws2 = XLSX.utils.json_to_sheet(bookingviewScenarios);
ws2['!cols'] = fitCols(bookingviewScenarios);
XLSX.utils.book_append_sheet(wb, ws2, 'Booking_View');

// Sheet 3: Sales & Redemptions Detailed
const ws3 = XLSX.utils.json_to_sheet(salesRedemptionsScenarios);
ws3['!cols'] = fitCols(salesRedemptionsScenarios);
XLSX.utils.book_append_sheet(wb, ws3, 'Sales_Redemptions');

// Sheet 4: Reports & Analytics Detailed
const ws4 = XLSX.utils.json_to_sheet(reportsScenarios);
ws4['!cols'] = fitCols(reportsScenarios);
XLSX.utils.book_append_sheet(wb, ws4, 'Reports_Analytics');

// Sheet 5: Coverage Matrix Summary
const ws5 = XLSX.utils.json_to_sheet(coverageMatrix);
ws5['!cols'] = fitCols(coverageMatrix);
XLSX.utils.book_append_sheet(wb, ws5, 'Coverage_Matrix');

const excelPath = path.resolve('c:/Users/Admin/Auto1/Auto1_Detailed_Test_Scenarios.xlsx');
XLSX.writeFile(wb, excelPath);
console.log(`✅ Master Detailed Excel file generated successfully at: ${excelPath}`);
