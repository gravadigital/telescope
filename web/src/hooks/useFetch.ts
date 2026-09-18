import { useState, useEffect } from 'react';

type HttpMethod = 'GET' | 'POST';

type FetchHookProps = {
  url: string;
  method: HttpMethod;
  headers?: HeadersInit;
  body?: BodyInit;
};

type ResponseData = {
  body: unknown;
  statusCode: number;
};

type UseFetchReturn = {
  isLoading: boolean;
  response: ResponseData | null;
};

export default function useFetch({ url, method, headers, body }: FetchHookProps): UseFetchReturn {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [response, setResponse] = useState<ResponseData | null>(null);

  useEffect(() => {
    const abortController = new AbortController();

    const fetchData = async () => {
      setIsLoading(true);

      try {
        const fetchOptions: RequestInit = {
          method,
          headers,
          signal: abortController.signal,
        };

        if (method === 'POST' && body) {
          fetchOptions.body = body;
        }

        const res = await fetch(url, fetchOptions);

        let responseBody: unknown;
        const contentType = res.headers.get('content-type');

        if (contentType && contentType.includes('application/json')) {
          responseBody = await res.json();
        } else {
          responseBody = await res.text();
        }

        setResponse({
          body: responseBody,
          statusCode: res.status,
        });
      } catch (error) {
        if (error instanceof Error && error.name !== 'AbortError') {
          console.error('Fetch error:', error);
          setResponse({
            body: { error: error.message },
            statusCode: 0,
          });
        }
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();

    return () => {
      abortController.abort();
    };
  }, [url, method, headers, body]);

  return {
    isLoading,
    response,
  };
}