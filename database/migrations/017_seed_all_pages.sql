-- =========================================================
-- Script to Seed All Application Pages into PAGE_MASTER
-- =========================================================

-- Step 1: Insert all Admin and Operations Pages
MERGE dbo.PAGE_MASTER AS Target
USING (VALUES
    -- Admin & Dashboard
    ('Admin Dashboard', '/admin/dashboard', 'Dashboard'),
    ('Users', '/admin/users', 'Admin'),
    ('IAM Access', '/admin/iam', 'Admin'),
    
    -- Operations
    ('Transport Requests', '/admin/transport-requests', 'Operations'),
    ('Edit Requests', '/admin/editrequest', 'Operations'),
    ('Trip Details Report', '/admin/admincontainerpage', 'Operations'),
    ('Filter Trips', '/admin/filtered-transport-requests', 'Operations'),
    ('Bed Attach/Detach', '/admin/bed-attachment', 'Operations'),
    ('Tyre Attach/Detach', '/admin/tire-attachment', 'Operations'),
    ('Job Order', '/admin/job-order', 'Operations'),
    ('Job Order Close', '/admin/job-order-close', 'Operations'),
    
    -- Masters
    ('Vendor Master', '/masters/vendors', 'Masters'),
    ('Fleet Equipment Master', '/masters/equipment', 'Masters'),
    ('Driver Master', '/masters/drivers', 'Masters'),
    ('Tire Master', '/masters/tires', 'Masters'),
    ('Tire Position Master', '/masters/tire-positions', 'Masters'),
    ('Bed Master', '/masters/beds', 'Masters'),
    ('Email Configuration', '/admin/email-config', 'Masters'),
    
    -- Commercial & Reports
    ('Payment Receipts', '/admin/payment-receipts', 'Commercial'),
    ('Daily Advance Payments', '/admin/daily-advance-payments', 'Reports'),
    ('Container Margin Report', '/admin/container-margin-report', 'Reports'),
    ('Tyre Attachment Report', '/admin/tire-attachment-report', 'Reports'),
    
    -- Customer Portal specific
    ('My Shipments', '/customer/my-shipments', 'Road Operations'),
    ('Container Stage', '/customer/container-page', 'Road Operations'),
    ('VIN Survey', '/customer/vinpage', 'Road Operations'),
    ('ASN Upload', '/customer/ASN', 'Documents'),
    ('Transport Reports', '/customer/reports', 'Reports')
) AS Source (PAGE_NAME, PAGE_URL, MODULE_GROUP)
ON Target.PAGE_NAME = Source.PAGE_NAME
WHEN NOT MATCHED BY TARGET THEN
    INSERT (PAGE_NAME, PAGE_URL, MODULE_GROUP, STATUS)
    VALUES (Source.PAGE_NAME, Source.PAGE_URL, Source.MODULE_GROUP, 'ACTIVE');

-- Note: We use MERGE so that this script can be safely re-run multiple times 
-- without inserting duplicate pages. It will only insert pages that are missing.
