# KRCKA CRM System

A comprehensive Customer Relationship Management system designed specifically for kosher agencies, with advanced establishment management and billing capabilities.

## Features

### 🏢 Client Management
- **Complete Client Profiles**: Store company information, contact details, addresses, and notes
- **Multi-Establishment Assignment**: Assign multiple establishments to each client
- **Status Tracking**: Active, Inactive, and Pending client statuses
- **Billing Terms Configuration**: Customizable payment terms per client
- **Advanced Search & Filtering**: Search by name, email, status, or establishment

### 🏪 Establishment Integration
- **Multi-Select Interface**: Easy selection of multiple establishments per client
- **Visual Badges**: Clear display of assigned establishments
- **Establishment-Specific Billing**: Create invoices for specific establishments
- **Dynamic Loading**: Real-time loading from existing establishment database

### 💰 Advanced Billing System
- **Professional Invoice Creation**: Detailed line items with quantities and rates
- **Establishment-Specific Invoices**: Bill for services at specific locations
- **Tax Calculations**: Automatic tax computation with customizable rates
- **Multiple Status Tracking**: Draft, Sent, Paid, and Overdue statuses
- **Invoice Duplication**: Quick creation of similar invoices
- **Client-Based Due Dates**: Automatic due date calculation based on client terms

### 📊 Reporting & Analytics
- **Quick Stats Dashboard**: Real-time overview of clients, invoices, and payments
- **Revenue Tracking**: Monthly revenue visualization
- **Client Status Distribution**: Visual breakdown of client statuses
- **Pending Payments**: Track outstanding amounts

### 🔐 Security & Access Control
- **Admin-Only Access**: Restricted to users with admin or manager roles
- **Netlify Identity Integration**: Secure authentication system
- **Firebase Security**: Protected database operations
- **Audit Trail**: Track creation and modification timestamps

## Technical Architecture

### Frontend
- **HTML5 & CSS3**: Modern, responsive design
- **Bootstrap 5**: Professional UI components
- **JavaScript ES6+**: Modern JavaScript features
- **Chart.js**: Data visualization for reports

### Backend
- **Firebase Firestore**: NoSQL database for scalability
- **Netlify Identity**: Authentication and user management
- **Real-time Updates**: Live data synchronization

### Database Collections

#### Clients Collection
```javascript
{
  companyName: "string",
  contactPerson: "string", 
  email: "string",
  phone: "string",
  address: "string",
  status: "active|inactive|pending",
  billingTerms: "number", // days
  establishments: ["establishmentId1", "establishmentId2"],
  notes: "string",
  createdAt: "timestamp",
  createdBy: "string",
  updatedAt: "timestamp",
  updatedBy: "string"
}
```

#### Enhanced Invoices Collection
```javascript
{
  invoiceNumber: "string",
  clientId: "string",
  clientEmail: "string",
  establishments: ["establishmentId1", "establishmentId2"],
  issueDate: "timestamp",
  dueDate: "timestamp",
  status: "draft|sent|paid|overdue",
  items: [
    {
      description: "string",
      quantity: "number",
      rate: "number",
      total: "number"
    }
  ],
  subtotal: "number",
  taxRate: "number",
  taxAmount: "number",
  totalAmount: "number",
  createdAt: "timestamp",
  createdBy: "string"
}
```

## Installation & Setup

1. **File Structure**: Ensure the CRM system is placed in the `/crm/` directory
2. **Dependencies**: All dependencies are loaded via CDN (no local installation required)
3. **Firebase Configuration**: Uses existing Firebase configuration
4. **Authentication**: Integrates with existing Netlify Identity setup

## Usage Guide

### Adding a New Client
1. Navigate to the Clients tab
2. Click "Add New Client"
3. Fill in company and contact information
4. Select relevant establishments using the multi-select interface
5. Set billing terms and status
6. Add any relevant notes
7. Save the client

### Creating an Invoice
1. Go to the Billing & Invoices tab
2. Click "Create Invoice"
3. Select the client (establishments will auto-populate)
4. Choose which establishments to bill for
5. Add line items with descriptions, quantities, and rates
6. Set tax rate if applicable
7. Review totals and create invoice

### Managing Establishments
- Establishments are loaded from the existing establishments database
- Use the multi-select interface to assign/remove establishments
- Visual badges show assigned establishments clearly
- Filter clients by establishment assignments

## Key Improvements Over Legacy System

### 🔄 Enhanced Data Structure
- **Normalized Client Data**: Separate client profiles from invoices
- **Establishment Relationships**: Many-to-many relationship between clients and establishments
- **Audit Trail**: Complete tracking of who created/modified what and when

### 🎨 Modern User Interface
- **Responsive Design**: Works on all device sizes
- **Professional Styling**: Modern gradients and animations
- **Intuitive Navigation**: Tab-based interface for easy access
- **Visual Feedback**: Loading states, hover effects, and smooth transitions

### ⚡ Performance Optimizations
- **Efficient Queries**: Optimized Firebase queries with proper indexing
- **Real-time Updates**: Live data synchronization without page refreshes
- **Caching**: Smart caching of establishment and client data

### 🔍 Advanced Features
- **Multi-criteria Filtering**: Filter by multiple parameters simultaneously
- **Quick Actions**: Direct actions from table rows
- **Bulk Operations**: Future-ready for bulk client operations
- **Export Capabilities**: Ready for data export functionality

## Security Considerations

- **Role-Based Access**: Only admin and manager roles can access the CRM
- **Data Validation**: Client-side and server-side validation
- **Secure Queries**: Firestore security rules compliance
- **Audit Logging**: Track all data modifications

## Future Enhancements

### Planned Features
- **Email Integration**: Send invoices directly from the system
- **Payment Processing**: Integrate with payment gateways
- **Document Management**: Attach contracts and certificates
- **Advanced Reporting**: Custom report generation
- **Mobile App**: Native mobile application
- **API Integration**: RESTful API for third-party integrations

### Scalability Considerations
- **Database Optimization**: Prepared for large datasets
- **Caching Strategy**: Redis integration for high-performance caching
- **Load Balancing**: Ready for horizontal scaling
- **Backup Strategy**: Automated backup and recovery procedures

## Support & Maintenance

### Regular Maintenance Tasks
- **Database Cleanup**: Remove old draft invoices
- **Performance Monitoring**: Track query performance
- **Security Updates**: Keep dependencies updated
- **Backup Verification**: Ensure backup integrity

### Troubleshooting
- **Authentication Issues**: Check Netlify Identity configuration
- **Data Loading Problems**: Verify Firebase connection and permissions
- **UI Issues**: Clear browser cache and check console for errors

## Integration with Existing Systems

The CRM system seamlessly integrates with:
- **Existing Firebase Database**: Uses the same Firebase project
- **Netlify Identity**: Leverages existing user authentication
- **Establishment System**: Reads from existing establishments collection
- **Legacy Invoice System**: Can coexist with the old system during transition

This CRM system represents a significant upgrade to your kosher agency management capabilities, providing a professional, scalable, and user-friendly solution for managing clients, establishments, and billing operations.