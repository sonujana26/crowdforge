let csrf = '';
export async function sessionInfo() {
  const response = await fetch('/api/session');
  const data = (await response.json()) as {
    creator: boolean;
    csrf: string;
    passwordConfigured: boolean;
  };
  csrf = data.csrf;
  return data;
}
export async function api(path: string, body: unknown = {}) {
  if (!csrf) await sessionInfo();
  const response = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': csrf },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    message?: string;
    csrf?: string;
    accepted?: boolean;
    reason?: string;
  };
  if (!response.ok) throw new Error(data.message || 'Request failed');
  if (data.csrf) csrf = data.csrf;
  return data;
}
