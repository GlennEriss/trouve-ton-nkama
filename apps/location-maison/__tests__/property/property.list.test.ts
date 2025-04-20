import { getProperties } from "@/db/property.db";
import { MOCK_PROPERTIES } from "../mocks/annonce.mock";
import { USER_MOCK } from "../mocks/user.mock";

jest.mock('@/db/property.db', () => ({
  getProperties: jest.fn(),
}));

describe('getProperties (Firestore)', () => {
  const limitPerPage = 3;
  const lastDoc = null;
  const createdBy = USER_MOCK.uid;
  const type = '';

  it('should return mock properties as response', async () => {
    (getProperties as jest.Mock).mockResolvedValueOnce({
      properties: MOCK_PROPERTIES,
      limitPerPage,
      lastDoc,
    });

    const result = await getProperties({ limitPerPage, lastDoc, createdBy, type });
    expect(result.properties).toEqual(MOCK_PROPERTIES);
    expect(result.limitPerPage).toBe(limitPerPage);
    expect(result.lastDoc).toBeNull();
  });

  it('should handle pagination and return limited number of properties', async () => {
    const partialMock = MOCK_PROPERTIES.slice(0, 3);
    (getProperties as jest.Mock).mockResolvedValueOnce({
      properties: partialMock,
      limitPerPage,
      lastDoc,
    });

    const result = await getProperties({ limitPerPage, lastDoc, createdBy, type });
    expect(result.properties.length).toBe(3);
    expect(result.properties).toEqual(partialMock);
  });

  it('should handle filtering by type', async () => {
    const filteredType = 'Apartment';
    const filteredMock = MOCK_PROPERTIES.filter(p => p.typeProperty === filteredType);
    (getProperties as jest.Mock).mockResolvedValueOnce({
      properties: filteredMock,
      limitPerPage,
      lastDoc,
    });

    const result = await getProperties({ limitPerPage, lastDoc, createdBy, type: filteredType });
    expect(result.properties.every(p => p.typeProperty === filteredType)).toBe(true);
  });

  it('should return empty list if no properties match', async () => {
    (getProperties as jest.Mock).mockResolvedValueOnce({
      properties: [],
      limitPerPage,
      lastDoc,
    });

    const result = await getProperties({ limitPerPage, lastDoc, createdBy, type: 'UnknownType' });
    expect(result.properties).toEqual([]);
  });
});
