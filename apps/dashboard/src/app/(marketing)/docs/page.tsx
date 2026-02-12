import { redirect } from 'next/navigation';

export default function DocsPage() {
  // Redirect to external docs for now
  // TODO: Build in-app docs
  redirect('https://github.com/milo4jo/contextkit#readme');
}
