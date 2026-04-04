const fs = require('fs');
let t = fs.readFileSync('d:/github/cinema-management-system/movie-ticket-booking-system/frontend/movie-app/src/view/routes/AppRoutes.tsx', 'utf8');

t = t.replace(/import \{ BookingsManagementPage \}from '\.\.\/pages\/admin\/BookingsManagementPage';/, 
  "import { BookingsManagementPage }from '../pages/admin/BookingsManagementPage';\nimport { IoTMonitorPage }        from '../pages/admin/IoTMonitorPage';\nimport { SeatQrManagementPage }  from '../pages/admin/SeatQrManagementPage';\nimport { UserManualPage }        from '../pages/admin/UserManualPage';"
);

const routesToAdd = 
    <Route path="/admin/iot-monitor" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER']}>
        <IoTMonitorPage />
      </RoleBasedRoute>
    } />
    <Route path="/admin/seat-qr-codes" element={
      <RoleBasedRoute allowedRoles={['ADMIN']}>
        <SeatQrManagementPage />
      </RoleBasedRoute>
    } />
    <Route path="/admin/manual" element={
      <RoleBasedRoute allowedRoles={['ADMIN', 'MANAGER', 'OPERATOR']}>
        <UserManualPage />
      </RoleBasedRoute>
    } />
;

t = t.replace(/<Route path="\/admin\/bookings" element=\{\n\s*<RoleBasedRoute allowedRoles=\{\['ADMIN', 'MANAGER'\]\}>\n\s*<BookingsManagementPage \/>\n\s*<\/RoleBasedRoute>\n\s*\} \/>/, 
  '<Route path="/admin/bookings" element={\n      <RoleBasedRoute allowedRoles={[\'ADMIN\', \'MANAGER\']}>\n        <BookingsManagementPage />\n      </RoleBasedRoute>\n    } />\n' + routesToAdd
);

fs.writeFileSync('d:/github/cinema-management-system/movie-ticket-booking-system/frontend/movie-app/src/view/routes/AppRoutes.tsx', t);
console.log('Added all missing admin routes!');
