import React from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { store } from './viewmodel/store';
import { AppRoutes } from './view/routes/AppRoutes';
import { ErrorBoundary } from './view/components/common/ErrorBoundary';
import { ToastProvider } from './view/components/common/Toast';

const App: React.FC = () => (
  <Provider store={store}>
    <BrowserRouter>
      <ErrorBoundary>
        <ToastProvider>
          <AppRoutes />
        </ToastProvider>
      </ErrorBoundary>
    </BrowserRouter>
  </Provider>
);

export default App;