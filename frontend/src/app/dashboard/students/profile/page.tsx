import { Header } from '@/components/dashboard/Header';
import StudentProfileView from '@/components/Students/StudentProfileView';

export default function StudentProfilePage() {
  return (
    <div className="w-full md:w-[85%] min-h-screen overflow-y-auto bg-bg-light-secondary dark:bg-bg-dark-primary">
      <Header value="Student Profile" />
      <div className="px-3 py-4 sm:px-6 md:px-4">
        <StudentProfileView />
      </div>
    </div>
  );
}
