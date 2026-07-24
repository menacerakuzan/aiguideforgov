import { RouteTransition } from '@/components/route-transition';

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  return <RouteTransition>{children}</RouteTransition>;
}
