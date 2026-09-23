import { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './Pages/Home';
import ScrollToTop from './components/ScrollToTop';
import initLenis from './lib/lenis';

function App() {
    useEffect(() => {
        const lenis = initLenis();
        return () => lenis.destroy();
    }, []);

    return (
        <div className="bg-(--white-color) min-h-screen overflow-hidden">
            <Router>
                <ScrollToTop />
                <Routes>
                    <Route path="/" element={<Home />} />
                </Routes>
            </Router>
        </div>
    );
}
export default App;