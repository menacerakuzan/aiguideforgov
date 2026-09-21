import { RouteTransition } from '@/components/route-transition';

export default function DemoTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
