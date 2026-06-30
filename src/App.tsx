import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './routes/home/Home';
import { TeacherConsole } from './routes/teacher/TeacherConsole';
import { StudentPlay } from './routes/play/StudentPlay';
import { TvScreen } from './routes/tv/TvScreen';
import { DemoView } from './routes/demo/DemoView';
import { TeacherGate } from './features/teacher-auth/TeacherGate';
import { AdminGate } from './features/admin/AdminGate';
import { AdminConsole } from './routes/admin/AdminConsole';
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
        <Route path="/" element={<Home />} />
        <Route
          path="/teacher"
          element={
            <TeacherGate>
              <TeacherConsole />
            </TeacherGate>
          }
        />
        <Route
          path="/admin"
          element={
            <AdminGate>
              <AdminConsole />
            </AdminGate>
          }
        />
        <Route path="/play" element={<StudentPlay />} />
        <Route path="/tv" element={<TvScreen />} />
        <Route path="/demo" element={<DemoView />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
