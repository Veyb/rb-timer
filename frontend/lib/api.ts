const API_URL = 'https://api.l2m-db.ru/api';

export const transformBossApiResponse = ({
  data: { attributes, ...rest },
}: any) => ({
  ...rest,
  ...attributes,
});

export const transformBossListApiResponse = (data: any) => {
  return data.data.map(({ attributes, ...rest }: any) => ({
    ...rest,
    ...attributes,
  }));
};

export async function get(type: string) {
  const res = await fetch(`${API_URL}/${type}`, { cache: 'no-cache' });
  const data = await res.json();
  return transformBossListApiResponse(data);
}

export async function updateBossTime(
  bossId: string,
  time: string,
  approximately: boolean = false
) {
  const response = await fetch(`${API_URL}/bosses/${bossId}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      // 'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: JSON.stringify({ data: { time, approximately } }), // body data type must match "Content-Type" header
  });
  const data = await response.json();
  return transformBossApiResponse(data);
}
