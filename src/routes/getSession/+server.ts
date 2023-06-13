import { getSession } from '@auth/sveltekit';
import { authConfig } from '../../hooks.server';
import { json } from '@sveltejs/kit';

export async function GET(event) {
  
  const session = await getSession(event.request, authConfig);

  return json(session)

};