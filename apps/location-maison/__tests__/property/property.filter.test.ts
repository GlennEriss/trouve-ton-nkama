import { describe, it, expect, jest } from '@jest/globals';

describe('handleFilterChange', () => {
  const mockReplace = jest.fn();
  const pathname = '/properties';
  const baseSearchParams = new URLSearchParams();

  const createHandler = (searchParams: URLSearchParams = baseSearchParams) => {
    return (value: string) => {
      const params = new URLSearchParams(searchParams.toString());

      if (value) {
        params.set('type', value);
      } else {
        params.delete('type');
      }

      mockReplace(`${pathname}?${params.toString()}`, { scroll: false });
    };
  };

  it('should set the "type" param when a filter value is provided', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('home');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=home', { scroll: false });
  });

  it('should delete the "type" param when value is empty', () => {
    const handleFilterChange = createHandler(new URLSearchParams({ type: 'home' }));
    handleFilterChange('');

    expect(mockReplace).toHaveBeenCalledWith('/properties?', { scroll: false });
  });

  it('should preserve other params when adding a new type', () => {
    const handleFilterChange = createHandler(new URLSearchParams({ page: '2' }));
    handleFilterChange('apartment');

    expect(mockReplace).toHaveBeenCalledWith('/properties?page=2&type=apartment', { scroll: false });
  });

  it('should update type to "studio"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('studio');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=studio', { scroll: false });
  });

  it('should update type to "land"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('land');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=land', { scroll: false });
  });

  it('should update type to "desk"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('desk');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=desk', { scroll: false });
  });

  it('should update type to "building"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('building');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=building', { scroll: false });
  });

  it('should update type to "shop"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('shop');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=shop', { scroll: false });
  });

  it('should update type to "kiosk"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('kiosk');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=kiosk', { scroll: false });
  });

  it('should update type to "room"', () => {
    const handleFilterChange = createHandler();
    handleFilterChange('room');

    expect(mockReplace).toHaveBeenCalledWith('/properties?type=room', { scroll: false });
  });
});
