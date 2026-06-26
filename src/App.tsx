import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { TeacherConsole } from './routes/teacher/TeacherConsole';
import { StudentPlay } from './routes/play/StudentPlay';
import { TvScreen } from './routes/tv/TvScreen';
import { MuseumShell } from './components/MuseumShell';
import { useAuthReady } from './firebase/hooks';

export function App() {
  const ready = useAuthReady();

  if (!ready) {
    return <MuseumShell title="미술관을 여는 중…" route="" />;
  }

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
