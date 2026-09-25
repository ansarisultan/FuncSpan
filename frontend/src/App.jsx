import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AIProvider } from './context/AIContext';
import Layout from './components/layout/Layout';
import Playground from './pages/Playground';
import Landing from './pages/Landing';
import ProxyInterface from './pages/ProxyInterface';
import CustomCursor from './components/ui/CustomCursor';

export default function App() {
  return (
    <AIProvider>
      <BrowserRouter>
        <Routes>
          {/* Landing Page - FuncSpan */}
          <Route path="/" element={<Landing />} />
          
          {/* Proxy Interface Pages */}
          <Route path="/proxy-interface" element={<ProxyInterface />} />
          <Route path="/proxy-interface/:proxyId" element={<ProxyInterface />} />
          
          {/* App Routes - FuncLexa Assets */}
          <Route path="/app/*" element={
            <Layout>
              <Routes>
                <Route path="/" element={<Playground />} />
                <Route path="/config" element={<Playground />} />
                <Route path="/proxy" element={<Playground />} />
                <Route path="/logs" element={<Playground />} />
                <Route path="/stress" element={<Playground />} />
                <Route path="/scenarios" element={<Playground />} />
                <Route path="/generator" element={<Playground />} />
              </Routes>
            </Layout>
          } />
        </Routes>
        <CustomCursor />
      </BrowserRouter>
    </AIProvider>
  );
}
