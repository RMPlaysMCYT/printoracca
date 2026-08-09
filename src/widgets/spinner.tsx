import { Loader2 } from 'lucide-react';
import "../styles/spinner.css";

export default function LoadingWidget() {
  return (
    <Loader2 className="animate-spin text-blue-500" size={32} />
  );
}
