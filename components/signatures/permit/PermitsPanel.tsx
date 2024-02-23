import { InformationCircleIcon } from '@heroicons/react/24/outline';
import { useQuery } from '@tanstack/react-query';
import Card from 'components/common/Card';
import Error from 'components/common/Error';
import TableBodyLoader from 'components/common/TableBodyLoader';
import WithHoverTooltip from 'components/common/WithHoverTooltip';
import { useAddressAllowances, useAddressEvents } from 'lib/hooks/page-context/AddressPageContext';
import { deduplicateArray } from 'lib/utils';
import { getAllowanceKey, stripAllowanceData } from 'lib/utils/allowances';
import { getLastCancelled } from 'lib/utils/permit';
import { filterAsync, mapAsync } from 'lib/utils/promises';
import { hasSupportForPermit, hasZeroBalance } from 'lib/utils/tokens';
import useTranslation from 'next-translate/useTranslation';
import { useLayoutEffect, useState } from 'react';
import PermitsEntry from './PermitsEntry';

const PermitsPanel = () => {
  const ROW_HEIGHT = 52;
  const [loaderHeight, setLoaderHeight] = useState<number>(ROW_HEIGHT * 12);

  useLayoutEffect(() => {
    // 530 is around the size of the headers and controls (and at least 2 row also on small screens)
    setLoaderHeight(Math.max(window.innerHeight - 530, 2 * ROW_HEIGHT + 68));
  }, []);

  const { t } = useTranslation();
  const { allowances, error: allowancesError, isLoading: isAllowancesLoading } = useAddressAllowances();
  const { events } = useAddressEvents();
  const {
    data: permitTokens,
    error: permitsError,
    isLoading: isPermitsLoading,
  } = useQuery({
    queryKey: ['permitTokens', allowances?.map(getAllowanceKey)],
    queryFn: async () => {
      const ownedTokens = deduplicateArray(allowances, (a, b) => a.contract.address === b.contract.address)
        .filter((token) => !hasZeroBalance(token.balance, token.metadata.decimals) && token)
        .map(stripAllowanceData);

      const permitTokens = await mapAsync(
        filterAsync(ownedTokens, (token) => hasSupportForPermit(token.contract)),
        async (token) => ({ ...token, lastCancelled: await getLastCancelled(events.approval, token) }),
      );

      return permitTokens;
    },
    enabled: !!allowances,
    staleTime: Infinity,
  });

  const isLoading = isAllowancesLoading || isPermitsLoading || !permitTokens;
  const error = allowancesError || permitsError;

  const title = (
    <div className="flex items-center gap-2">
      <div>{t('address:signatures.permit.title')}</div>
      <WithHoverTooltip tooltip={t('address:tooltips.permit_signatures')}>
        <div>
          <InformationCircleIcon className="w-4 h-4" />
        </div>
      </WithHoverTooltip>
    </div>
  );

  if (error) {
    return (
      <Card title={title} className="w-full flex justify-center items-center h-12">
        <Error error={error} />
      </Card>
    );
  }

  if (isLoading) {
    return (
      <Card title={title} className="w-full p-0">
        <table className="w-full border-collapse">
          <TableBodyLoader columns={1} rows={Math.floor(loaderHeight / ROW_HEIGHT)} className="max-sm:hidden" />
          <TableBodyLoader columns={1} rows={Math.floor((loaderHeight - 68) / ROW_HEIGHT)} className="sm:hidden" />
        </table>
      </Card>
    );
  }

  if (permitTokens.length === 0) {
    return (
      <Card title={title} className="w-full flex justify-center items-center h-12">
        <p className="text-center">{t('address:signatures.permit.none_found')}</p>
      </Card>
    );
  }

  return (
    <Card title={title} className="p-0 overflow-x-scroll whitespace-nowrap scrollbar-hide">
      <table className="w-full">
        <thead>
          <tr className="border-b border-black dark:border-white h-10">
            <th className="text-left px-4 whitespace-nowrap">{t('address:headers.asset')}</th>
            <th className="text-left whitespace-nowrap">{t('address:headers.last_cancelled')}</th>
            <th className="text-right px-4 whitespace-nowrap">{t('address:headers.actions')}</th>
          </tr>
        </thead>
        <tbody>
          {permitTokens.map((token) => (
            <PermitsEntry key={token.contract.address} token={token} />
          ))}
        </tbody>
      </table>
    </Card>
  );
};

export default PermitsPanel;
