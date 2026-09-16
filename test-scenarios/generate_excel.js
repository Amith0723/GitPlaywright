const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const bookingviewRows = [
  {
    "Test ID": "TC_BV_001",
    "Module": "Bookings - Authentication",
    "Test Scenario Description": "Verify successful login and landing on Home dashboard before booking operations",
    "Preconditions": "Valid business owner credentials exist",
    "Test Steps": "1. Navigate to https://devbiz.zylu.co/\n2. Select Email & Password tab\n3. Enter valid Email Address\n4. Enter valid Password\n5. Click Sign In button",
    "Test Data": "URL: https://devbiz.zylu.co/\nEmail: test_automation_owner@zylu.co\nPassword: valid_password",
    "Expected Result": "User is successfully authenticated and redirected to Home dashboard (/#/home)",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_002",
    "Module": "Bookings - Navigation",
    "Test Scenario Description": "Verify navigation to Bookings management module",
    "Preconditions": "User is logged in on Home screen",
    "Test Steps": "1. Click on Bookings option in the sidebar navigation\n2. If sidebar is collapsed, navigate directly to /#/bookings\n3. Wait for Bookings screen to load",
    "Test Data": "URL: /#/bookings",
    "Expected Result": "Bookings module loads successfully and URL updates to /#/bookings with view controls displayed",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_003",
    "Module": "Bookings - View Toggle",
    "Test Scenario Description": "Verify switching between Calendar View and List View",
    "Preconditions": "User is on Bookings screen",
    "Test Steps": "1. Check the active view mode\n2. If toggle button displays 'List View', click on it\n3. Verify view switches to table/list format",
    "Test Data": "Toggle Button: 'List View'",
    "Expected Result": "Bookings are rendered in a tabular list view displaying columns for ID, Date, Customer, Staff, Status, Amount, and Actions",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_004",
    "Module": "Bookings - List View Data Display",
    "Test Scenario Description": "Verify booking row displays correct booking information in List View",
    "Preconditions": "List View has at least one booking row",
    "Test Steps": "1. Locate the first booking row in List View\n2. Verify Booking ID is present (e.g. #8440)\n3. Verify Date & Time format (e.g. DD/MM/YYYY hh:mm AM/PM)\n4. Verify Customer name is displayed\n5. Verify Staff member name is displayed\n6. Verify Status badge (e.g. Completed, Voided, Confirmed)\n7. Verify Amount with currency symbol (e.g. ₹150.00)",
    "Test Data": "Sample Row Data:\nDate: 11/9/2026 04:46 PM\nCustomer: Customer_5512\nStaff: Dhruv Salat\nStatus: Completed\nAmount: ₹150.00",
    "Expected Result": "All booking row attributes are displayed clearly and properly formatted in their respective columns",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_005",
    "Module": "Bookings - Action Menu",
    "Test Scenario Description": "Verify clicking three dots (⋮) button opens contextual action menu",
    "Preconditions": "At least one booking row visible in List View",
    "Test Steps": "1. Identify target booking row\n2. Locate the three dots (Show menu) button at the right end of the row\n3. Click the three dots button",
    "Test Data": "Button: 'Show menu'",
    "Expected Result": "Contextual popup menu appears displaying options: View Details, Generate Invoice, Share, Copy Booking, Add Todo",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_006",
    "Module": "Bookings - Action Menu Options",
    "Test Scenario Description": "Verify all expected menu options are present in the row actions popup",
    "Preconditions": "Three dots popup menu is currently open",
    "Test Steps": "1. Inspect visible options in the popup menu\n2. Confirm presence of:\n   - View Details\n   - Generate Invoice\n   - Share\n   - Copy Booking\n   - Add Todo",
    "Test Data": "Menu Items: View Details, Generate Invoice, Share, Copy Booking, Add Todo",
    "Expected Result": "All standard booking actions are rendered, enabled, and clickable",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_007",
    "Module": "Bookings - View Details Modal",
    "Test Scenario Description": "Verify clicking 'View Details' opens the comprehensive Booking Details screen",
    "Preconditions": "Three dots menu is open",
    "Test Steps": "1. Click on 'View Details' menu item\n2. Wait for the dialog/modal to open\n3. Verify modal header and dialog elements",
    "Test Data": "Menu item: 'View Details'",
    "Expected Result": "Booking Details dialog opens displaying modal title 'Booking', close/back button, and full details container",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_008",
    "Module": "Bookings - Details Data Consistency",
    "Test Scenario Description": "Verify Booking Details modal data matches the selected list view row",
    "Preconditions": "Booking Details modal is open",
    "Test Steps": "1. Retrieve Booking ID from details and compare with list row\n2. Retrieve Customer Name and compare with list row\n3. Retrieve Booking Status and compare with list row\n4. Retrieve Staff Name and compare with list row\n5. Retrieve Total Amount and compare with list row",
    "Test Data": "Target: Booking #8440\nCustomer: Customer_5512\nStatus: Completed",
    "Expected Result": "All details shown in the details view exactly match the data shown on the list view row and backend API record",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_009",
    "Module": "Bookings - Store & Location Details",
    "Test Scenario Description": "Verify salon branch and location information are displayed in Booking Details view",
    "Preconditions": "Booking Details modal is open",
    "Test Steps": "1. Check the store name banner\n2. Check the store address section",
    "Test Data": "Store: The Comfort Zone Spa - Org1 /Premium\nLocation: At Store, Rajajinagar, Bengaluru",
    "Expected Result": "Store name and complete physical address are accurately rendered in the booking header",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  },
  {
    "Test ID": "TC_BV_010",
    "Module": "Bookings - Responsive & Layout Validation",
    "Test Scenario Description": "Verify booking details UI elements do not overflow or misalign on desktop resolutions",
    "Preconditions": "Browser at 1280x720 or higher",
    "Test Steps": "1. Open Booking Details view\n2. Inspect cards: Contact Customer, Booking Details, Payment Summary, Booking Notes\n3. Check scrollability if content exceeds viewport",
    "Test Data": "Viewport: 1280x720",
    "Expected Result": "All cards and text fields fit within viewport or are smoothly scrollable without horizontal layout breakages",
    "Execution Type": "Automated (Playwright)",
    "Status": "Pass"
  }
];

const masterRows = [
  {
    "Test Scenario ID": "TS_BV_001",
    "Module / Feature": "Bookings Management",
    "Test Scenario Name": "Verify Navigation and Switching to Bookings List View",
    "Preconditions": "User is authenticated on business portal",
    "Test Steps": "1. Login to https://devbiz.zylu.co/\n2. Click Bookings from sidebar or navigate to /#/bookings\n3. Click 'List View' toggle button if in Calendar mode",
    "Test Data": "URL: /#/bookings",
    "Expected Result": "Bookings list table loads displaying columns for Booking ID, Date & Time, Customer, Staff, Status, Amount, and Actions",
    "Spec File Reference": "tests/Bookingview.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_002",
    "Module / Feature": "Bookings Management",
    "Test Scenario Name": "Verify Row Inspection and Three-Dot Action Menu Options",
    "Preconditions": "At least one booking row exists in list",
    "Test Steps": "1. Identify target booking row\n2. Inspect and capture Date, Customer Name, Staff, Status, and Amount\n3. Click the three dots (Show menu) button on the row",
    "Test Data": "Action: Three dots button",
    "Expected Result": "Popup menu opens displaying View Details, Generate Invoice, Share, Copy Booking, and Add Todo",
    "Spec File Reference": "tests/Bookingview.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_BV_003",
    "Module / Feature": "Bookings Management",
    "Test Scenario Name": "Verify View Details Screen and Consistency with List Row",
    "Preconditions": "Booking row menu is open",
    "Test Steps": "1. Click 'View Details' from popup menu\n2. Wait for Booking details dialog to display\n3. Verify modal title 'Booking' and Store info\n4. Compare Booking ID, Customer Name, Staff, Status, and Amount with list row",
    "Test Data": "Row Data: #8440, Customer_5512, Completed, Dhruv Salat, ₹150.00",
    "Expected Result": "All details displayed in the modal match the list row data and backend API record with 100% accuracy",
    "Spec File Reference": "tests/Bookingview.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PR_001",
    "Module / Feature": "Package Redemption",
    "Test Scenario Name": "Verify Customer Search and Incomplete Bookings Handling in New Sale",
    "Preconditions": "User is logged in on New Sale tab",
    "Test Steps": "1. Open New Sale > Booking tab\n2. Search customer by character queries until ≥3 results appear\n3. Select customer at index 2\n4. If 'Incomplete Bookings' modal appears, dismiss or continue appropriately",
    "Test Data": "Query: 'r' / 'a'\nCustomer index: 2",
    "Expected Result": "Customer is attached to sale; incomplete booking modal is handled without blocking the workflow",
    "Spec File Reference": "tests/package_redeem.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PR_002",
    "Module / Feature": "Package Redemption",
    "Test Scenario Name": "Verify Selecting Package and Assigning Unique Staff Members",
    "Preconditions": "Customer selected, New Sale open",
    "Test Steps": "1. Click '+ Package'\n2. Filter for package matching 'Personalized' or 'Standard' (or fallback first available)\n3. Click checkbox and click Apply\n4. For every service row, select an unassigned staff member (ensure unique assignment per row)",
    "Test Data": "Staff set: audi by rohan, Dhruv Salat, etc.",
    "Expected Result": "Package is added to sale, each row has a distinct assigned staff member, and Apply is successful",
    "Spec File Reference": "tests/package_redeem.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PR_003",
    "Module / Feature": "Package Redemption",
    "Test Scenario Name": "Verify Package Checkout and Online Payment Completion",
    "Preconditions": "Package added with assigned staff",
    "Test Steps": "1. Click Checkout button\n2. Select Payment method as 'Online'\n3. Click Complete Payment\n4. Verify Invoice Generation screen is reached",
    "Test Data": "Payment: Online",
    "Expected Result": "Sale is finalized, invoice is generated with unique Invoice Number, and payment status displays Paid",
    "Spec File Reference": "tests/package_redeem.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_MR_001",
    "Module / Feature": "Membership Redemption",
    "Test Scenario Name": "Verify Membership Selection and Customer Application",
    "Preconditions": "User is on New Sale > Booking tab",
    "Test Steps": "1. Search and select customer\n2. Handle incomplete booking dialog if present\n3. Click '+ Membership'\n4. Select first available active membership from catalog\n5. Click Apply",
    "Test Data": "Membership: Standard / Premium membership",
    "Expected Result": "Membership is attached to customer booking and membership benefits/discounts are reflected",
    "Spec File Reference": "tests/membershipredeem.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_MR_002",
    "Module / Feature": "Membership Redemption",
    "Test Scenario Name": "Verify Membership Checkout with Unique Staff Assignment and Online Payment",
    "Preconditions": "Membership applied to sale",
    "Test Steps": "1. Assign distinct staff to each service row\n2. Click Checkout\n3. Choose Online payment\n4. Complete payment and verify invoice",
    "Test Data": "Payment Method: Online",
    "Expected Result": "Transaction completes successfully; invoice confirms membership redemption with applied discount",
    "Spec File Reference": "tests/membershipredeem.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_CP_001",
    "Module / Feature": "Coupons & Discounts",
    "Test Scenario Name": "Verify Applying Promo Coupon During Sale Checkout",
    "Preconditions": "Active coupon exists in system",
    "Test Steps": "1. Create sale with service/product\n2. Enter valid coupon code in coupon input\n3. Click Apply Coupon\n4. Verify discount calculation on total payable amount",
    "Test Data": "Coupon Code: SAVE20 / FLAT50",
    "Expected Result": "Coupon is successfully applied, discount is subtracted from total, and updated amount is displayed",
    "Spec File Reference": "tests/couponsreedem.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PC_001",
    "Module / Feature": "Product Sales",
    "Test Scenario Name": "Verify Adding Random Product and Assigning Dedicated Staff Member",
    "Preconditions": "Catalog contains active products",
    "Test Steps": "1. Open New Sale > Product section\n2. Click '+ Product'\n3. Randomly select an in-stock product from the modal list\n4. Click Apply\n5. Assign a dedicated staff member to product commission",
    "Test Data": "Product: Random selection from available catalog",
    "Expected Result": "Product is added as line item with correct unit price, tax, and assigned staff member",
    "Spec File Reference": "tests/product_checkout.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_PC_002",
    "Module / Feature": "Product Sales",
    "Test Scenario Name": "Verify Product Sale Checkout and Invoice Generation",
    "Preconditions": "Product line item added with staff",
    "Test Steps": "1. Click Checkout\n2. Review product summary and total price\n3. Select payment method and click Complete\n4. Verify invoice displays sold product details",
    "Test Data": "Payment: Cash / Card / Online",
    "Expected Result": "Invoice is created showing product SKU, quantity, price, tax, and selling staff name",
    "Spec File Reference": "tests/product_checkout.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_NC_001",
    "Module / Feature": "Customer Management",
    "Test Scenario Name": "Verify End-to-End Registration of New Customer and First Sale",
    "Preconditions": "User on New Sale screen",
    "Test Steps": "1. Click '+ New Customer'\n2. Fill Customer Name, Phone Number, Email, and Gender\n3. Click Save Customer\n4. Add service and complete checkout",
    "Test Data": "Name: Auto_Customer_<random>\nPhone: 91XXXXXXXXXX",
    "Expected Result": "New customer is registered in database, attached to the current sale, and receipt is linked to customer profile",
    "Spec File Reference": "tests/newcustomere2e.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_GW_001",
    "Module / Feature": "Guest Walk-in",
    "Test Scenario Name": "Verify Fast Walk-in Customer Booking and Checkout",
    "Preconditions": "Quick sale flow active",
    "Test Steps": "1. Select Walk-in / Guest mode\n2. Select quick service\n3. Assign available staff\n4. Process cash checkout",
    "Test Data": "Type: Walk-in\nPayment: Cash",
    "Expected Result": "Sale completes without requiring mandatory customer profile creation, saving time for front-desk",
    "Spec File Reference": "tests/guest_walkin_checkE_E.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_IB_001",
    "Module / Feature": "Incomplete Bookings",
    "Test Scenario Name": "Verify Prompt and Resolution of Customer Incomplete Bookings",
    "Preconditions": "Customer has an existing open/draft booking",
    "Test Steps": "1. Select customer with incomplete booking history\n2. Verify 'Incomplete Bookings' modal triggers\n3. Verify options to Resume Booking or Discard / Dismiss\n4. Click Continue / Dismiss as appropriate",
    "Test Data": "Customer: Customer with draft booking",
    "Expected Result": "Modal correctly alerts front-desk staff to avoid duplicate bookings and permits seamless continuation or dismissal",
    "Spec File Reference": "tests/incomplete_booking.spec.js",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_DR_001",
    "Module / Feature": "Analytics & Reports",
    "Test Scenario Name": "Verify Daily Revenue Dashboard Calculation and Metric Cards",
    "Preconditions": "Completed sales exist for today",
    "Test Steps": "1. Navigate to Analytics / Daily Revenue (/#/reports)\n2. Verify Total Sales card\n3. Verify Payment breakdown (Cash, Card, Online, Memberships)\n4. Cross-verify with daily booking transactions sum",
    "Test Data": "Date: Today",
    "Expected Result": "Daily Revenue matches the mathematical sum of all completed invoices and payment modes for the day",
    "Spec File Reference": "tests/Dailyrevnue.spec.ts",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_SC_001",
    "Module / Feature": "Staff Management",
    "Test Scenario Name": "Verify Staff Summary and Commission Calculation for Completed Sales",
    "Preconditions": "Staff assigned to completed services/products",
    "Test Steps": "1. Navigate to Staff Summary / Commission screen\n2. Locate staff member (e.g. Dhruv Salat)\n3. Verify service count, product count, and earned commission percentage",
    "Test Data": "Staff: Assigned employees",
    "Expected Result": "Commission is accurately computed based on configured rules (e.g., 10% on services, 5% on retail)",
    "Spec File Reference": "tests/staff_commission.spec.ts",
    "Automation Status": "Automated (Passing)"
  },
  {
    "Test Scenario ID": "TS_TP_001",
    "Module / Feature": "Payment & Tips",
    "Test Scenario Name": "Verify Adding Staff Tip During Checkout and Receipt Representation",
    "Preconditions": "Checkout screen open with total amount",
    "Test Steps": "1. In checkout payment screen, enter Tip amount\n2. Allocate tip to specific performing staff member\n3. Complete transaction\n4. Verify invoice line item for tip",
    "Test Data": "Tip Amount: ₹50.00",
    "Expected Result": "Tip is added to total payment, allocated to the chosen staff member's report, and itemized on invoice",
    "Spec File Reference": "tests/tip.spec.js",
    "Automation Status": "Automated (Passing)"
  }
];

const summaryRows = [
  { "Module": "Bookings Management (Booking View)", "Test Scenarios Count": 10, "Automation Status": "Automated (Passing)", "Spec File": "tests/Bookingview.spec.js" },
  { "Module": "Package Redemption", "Test Scenarios Count": 3, "Automation Status": "Automated (Passing)", "Spec File": "tests/package_redeem.spec.js" },
  { "Module": "Membership Redemption", "Test Scenarios Count": 2, "Automation Status": "Automated (Passing)", "Spec File": "tests/membershipredeem.spec.js" },
  { "Module": "Coupons & Discounts", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/couponsreedem.spec.js" },
  { "Module": "Product Sales & Checkout", "Test Scenarios Count": 2, "Automation Status": "Automated (Passing)", "Spec File": "tests/product_checkout.spec.js" },
  { "Module": "Customer Management (New Customer E2E)", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/newcustomere2e.spec.js" },
  { "Module": "Guest Walk-in Checkout", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/guest_walkin_checkE_E.spec.js" },
  { "Module": "Incomplete Bookings Handling", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/incomplete_booking.spec.js" },
  { "Module": "Daily Revenue Reports", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/Dailyrevnue.spec.ts" },
  { "Module": "Staff Summary & Commission", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/staff_commission.spec.ts" },
  { "Module": "Payment & Tips Allocation", "Test Scenarios Count": 1, "Automation Status": "Automated (Passing)", "Spec File": "tests/tip.spec.js" }
];

// Helper to auto-fit column widths
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
    return { wch: Math.min(Math.max(maxLen + 4, 12), 60) };
  });
}

const wb = XLSX.utils.book_new();

// Sheet 1: Bookingview Scenarios
const ws1 = XLSX.utils.json_to_sheet(bookingviewRows);
ws1['!cols'] = fitCols(bookingviewRows);
XLSX.utils.book_append_sheet(wb, ws1, 'Bookingview_Scenarios');

// Sheet 2: Master Automation Scenarios
const ws2 = XLSX.utils.json_to_sheet(masterRows);
ws2['!cols'] = fitCols(masterRows);
XLSX.utils.book_append_sheet(wb, ws2, 'All_Automation_Scenarios');

// Sheet 3: Execution Summary
const ws3 = XLSX.utils.json_to_sheet(summaryRows);
ws3['!cols'] = fitCols(summaryRows);
XLSX.utils.book_append_sheet(wb, ws3, 'Suite_Summary');

const filePath = path.resolve('c:/Users/Admin/Auto1/Auto1_Test_Scenarios.xlsx');
XLSX.writeFile(wb, filePath);
console.log(`✅ Excel file generated successfully at: ${filePath}`);
