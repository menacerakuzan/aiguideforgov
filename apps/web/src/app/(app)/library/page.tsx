import { getLibrary } from '@proai/learning';
import { LibraryClient } from '@/components/library-client';
import { requirePageUser } from '@/lib/page-guard';

/**
 * Серверна оболонка: збирає бібліотеку прямим викликом сервісу й віддає її
 * разом із HTML. Раніше сторінка була клієнтською й тягнула ті самі дані
 * окремим запитом до /api/library вже після завантаження JS — саме через це
 * вміст зʼявлявся помітно пізніше за саму сторінку.
 */
export default async function LibraryPage() {
  const me = await requirePageUser();
  const initialData = await getLibrary(me.id);

  return <LibraryClient initialData={initialData} />;
}
