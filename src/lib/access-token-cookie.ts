const ACCESS_TOKEN_COOKIE = "token";
const ACCESS_TOKEN_CHUNK_COUNT_COOKIE = "tokenChunks";
const ACCESS_TOKEN_CHUNK_PREFIX = "token.";
const ACCESS_TOKEN_CHUNK_SIZE = 3_500;
const MAX_ACCESS_TOKEN_CHUNKS = 4;

type CookieReader = {
  get(name: string): { value: string } | undefined;
};

type CookieOptions = {
  httpOnly: boolean;
  secure: boolean;
  sameSite: "lax";
  path: string;
  maxAge: number;
};

type CookieWriter = {
  set(name: string, value: string, options: CookieOptions): unknown;
};

function options(maxAge: number): CookieOptions {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge,
  };
}

function expire(writer: CookieWriter, name: string) {
  writer.set(name, "", options(0));
}

export function readAccessTokenCookie(reader: CookieReader): string | undefined {
  const singleCookie = reader.get(ACCESS_TOKEN_COOKIE)?.value;
  if (singleCookie) return singleCookie;

  const count = Number(reader.get(ACCESS_TOKEN_CHUNK_COUNT_COOKIE)?.value);
  if (!Number.isInteger(count) || count < 2 || count > MAX_ACCESS_TOKEN_CHUNKS) return undefined;

  const chunks: string[] = [];
  for (let index = 0; index < count; index += 1) {
    const chunk = reader.get(`${ACCESS_TOKEN_CHUNK_PREFIX}${index}`)?.value;
    if (!chunk) return undefined;
    chunks.push(chunk);
  }
  return chunks.join("");
}

export function writeAccessTokenCookies(writer: CookieWriter, token: string, maxAge: number) {
  clearAccessTokenCookies(writer);

  if (token.length <= ACCESS_TOKEN_CHUNK_SIZE) {
    writer.set(ACCESS_TOKEN_COOKIE, token, options(maxAge));
    return;
  }

  const chunks = Array.from(
    { length: Math.ceil(token.length / ACCESS_TOKEN_CHUNK_SIZE) },
    (_, index) => token.slice(index * ACCESS_TOKEN_CHUNK_SIZE, (index + 1) * ACCESS_TOKEN_CHUNK_SIZE),
  );
  if (chunks.length > MAX_ACCESS_TOKEN_CHUNKS) {
    throw new Error("Access token exceeds the supported secure-session size");
  }

  writer.set(ACCESS_TOKEN_CHUNK_COUNT_COOKIE, String(chunks.length), options(maxAge));
  chunks.forEach((chunk, index) => {
    writer.set(`${ACCESS_TOKEN_CHUNK_PREFIX}${index}`, chunk, options(maxAge));
  });
}

export function clearAccessTokenCookies(writer: CookieWriter) {
  expire(writer, ACCESS_TOKEN_COOKIE);
  expire(writer, ACCESS_TOKEN_CHUNK_COUNT_COOKIE);
  for (let index = 0; index < MAX_ACCESS_TOKEN_CHUNKS; index += 1) {
    expire(writer, `${ACCESS_TOKEN_CHUNK_PREFIX}${index}`);
  }
}
