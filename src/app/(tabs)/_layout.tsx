import AppTabs from '@/components/app-tabs';
import { TabScrollProvider } from '@/context/tab-scroll';

export default function TabsLayout() {
  return (
    <TabScrollProvider>
      <AppTabs />
    </TabScrollProvider>
  );
}
