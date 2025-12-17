import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import ImportCourse from './pages/ImportCourse';
import PlanView from './pages/PlanView';
import Courses from './pages/Courses';
import CourseDetail from './pages/CourseDetail';

function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Dashboard />} />
                    <Route path="import" element={<ImportCourse />} />
                    <Route path="courses" element={<Courses />} />
                    <Route path="courses/:id" element={<CourseDetail />} />
                    <Route path="plan/:id" element={<PlanView />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
}

export default App;

