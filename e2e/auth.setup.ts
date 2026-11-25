import { expect, test as setup } from '@playwright/test';
import { stateFile } from './api';
import { PASSWORD, type UserKey, users } from './users';

for (const user of Object.keys(users) as UserKey[]) {
  setup(`login as ${user}`, async ({ request }) => {
    const res = await request.post('/api/auth/login', { data: { email: users[user], password: PASSWORD } });

    expect(res.status()).toBe(200);
    await request.storageState({ path: stateFile(user) });
  });
}
