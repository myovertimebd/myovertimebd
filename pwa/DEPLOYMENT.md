# Deployment and safety checklist

1. Create a new GitHub repository; keep the existing production repository untouched.
2. Push this folder's contents to the new repository.
3. Create a separate Render **Static Site** connected to the new repository.
4. Set build command blank and publish directory `.`.
5. Test all pages on Android Chrome and desktop.
6. Test backup/restore with dummy data before entering real personal records.
7. Verify payroll values against employer-approved examples.
8. Do not move the production domain until authentication, cloud database, migration and recovery are separately implemented and tested.
