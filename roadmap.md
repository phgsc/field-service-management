# Transitioning from Single-Tenant to Multi-Tenant SaaS

## 1. Current System (Single-Tenant)

The existing application is a **single-tenant** system used by a single company. It consists of:
- A **Node.js** backend with a **React (TypeScript)** frontend.
- **MongoDB** as the database.
- **Admins** can create unlimited admins and field engineers.
- Authentication is local, with users stored in a **users** collection.

## 2. Phase 1: Multi-Tenant System with Super Admin Provisioning

### **Key Changes:**
1. **Tenant Isolation:**
   - Use a **shared database** with a `tenantId` field in every document.

2. **Organization Collection:**
   - Create an `Org` collection to store:
     - **Tenant ID** (unique identifier)
     - **Human-readable tenant name**

3. **Subdomain-Based Tenant Routing:**
   - Adopt the **subdomain model** (`thisTenant.myApp.com`).
   - Configure DNS and server routing to handle tenant-based subdomains.

4. **User Management:**
   - Move users into a **separate collection** with a `tenantId` field.
   - Ensure users are scoped to their organization.
   - Limit each tenant to **3 free admins** and a capped number of engineers.

5. **Super Admin Provisioning:**
   - Implement a script to create the **first super admin**.
   - Super admin is **not tied to any tenant** (`tenantId: "superadmin"`).
   - Super admin provisions new organizations.

### **Super Admin Schema Example:**
```json
{
  "_id": "67d167b1ef736c0a3d99aa6e",
  "username": "superadmin",
  "password": "<Encrypted Password>",
  "isAdmin": true,
  "tenantId": "superadmin",
  "profile": {
    "lastPasswordReset": "2025-03-13T05:35:42.125Z"
  }
}
```

---
## 3. Phase 2: Self-Provisioning Multi-Tenant SaaS

### **Key Changes:**
1. **Self-Service Subscription & Licensing:**
   - Users can **sign up** and provision their own organizations.
   - **License management** controls user limits per tenant.

2. **Fine-Grained Authorization:**
   - Implement **Role-Based Access Control (RBAC)**.
   - Define **custom roles** beyond admin and engineer.
   - Store **permissions per role** (e.g., `can_create_work_orders: true`).

3. **OAuth2 Authentication:**
   - Support external providers (Google, Microsoft, custom OAuth2 clients).
   - Implement **SSO** for enterprise customers.

---
## 4. Task List (User Stories)

### **Phase 1: Multi-Tenancy & Super Admin**
- [ ] Implement `tenantId` field in all database collections.
- [ ] Create `Org` collection to store tenant metadata.
- [ ] Modify authentication system to check `tenantId`.
- [ ] Implement subdomain routing for tenants.
- [ ] Migrate users to a separate collection with `tenantId`.
- [ ] Limit admins (3 free) and engineers (license-based per org).
- [ ] Develop a script to create the first super admin.
- [ ] Ensure super admin can provision new organizations.

### **Phase 2: Self-Provisioning & OAuth2**
- [ ] Implement a self-service onboarding flow.
- [ ] Develop a license management system.
- [ ] Add Role-Based Access Control (RBAC) for fine-grained permissions.
- [ ] Support OAuth2 authentication with external providers.
- [ ] Enable enterprise SSO integration.

---
## Summary
This transition will move the system from a single-tenant app to a **fully multi-tenant SaaS** with **self-provisioning, licensing, and OAuth2 authentication**. Phase 1 introduces **super admin-controlled tenant creation**, while Phase 2 enables **self-service organization provisioning and advanced authorization**.

