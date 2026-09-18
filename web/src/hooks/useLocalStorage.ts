type TLocalStorageValue = number | string | boolean | object;

export default function useLocalStorage() {
  function setItem(key: string, value: TLocalStorageValue) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
      console.error(error);
    }
  }

  function getItem(key: string):TLocalStorageValue | null {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : null;
    } catch (error) {
      console.error(error);
      return null;
    }
  }

  function removeItem(key: string){
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(error);
    }
  }

  return {
    setItem,
    getItem,
    removeItem,
  }
}
