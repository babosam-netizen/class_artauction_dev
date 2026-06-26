import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeacherConsole } from './routes/teacher/TeacherConsole';
import { StudentPlay } from './routes/play/StudentPlay';
import { TvScreen } from './routes/tv/TvScreen';

export function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/teacher" element={<TeacherConsole />} />
        <Route path="/play" element={<StudentPlay />} />
        <Route path="/tv" element={<TvScreen />} />
        <Route path="*" element={<Navigate to="/teacher" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
