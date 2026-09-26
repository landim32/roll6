import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { ConfirmModal } from '../ui/ConfirmModal';
import { apiKeyService } from '../../Services/apiKeyService';
import {
  API_KEY_EXPIRATION, API_KEY_MAX_NAME, expirationToDate, parseUtc, tomorrowInBrasilia, validateApiKeyForm,
} from '../../lib/apiKeyForm';
import type { ApiKeyExpiration, ApiKeyForm } from '../../lib/apiKeyForm';
import { API_KEY_STATUS } from '../../types/apiKey';
import type { ApiKeyCreatedInfo, ApiKeyInfo, ApiKeyStatus } from '../../types/apiKey';

interface ApiKeysModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const EMPTY_FORM: ApiKeyForm = { name: '', choice: API_KEY_EXPIRATION.d30, dateText: '' };

const EXPIRATION_OPTIONS: { value: ApiKeyExpiration; label: string }[] = [
  { value: API_KEY_EXPIRATION.d7, label: 'apiKeys.exp7' },
  { value: API_KEY_EXPIRATION.d30, label: 'apiKeys.exp30' },
  { value: API_KEY_EXPIRATION.d90, label: 'apiKeys.exp90' },
  { value: API_KEY_EXPIRATION.d365, label: 'apiKeys.exp365' },
  { value: API_KEY_EXPIRATION.date, label: 'apiKeys.expDate' },
  { value: API_KEY_EXPIRATION.never, label: 'apiKeys.expNever' },
];

const STATUS_BADGE: Record<ApiKeyStatus, string> = {
  [API_KEY_STATUS.active]: 'text-bg-success',
  [API_KEY_STATUS.expired]: 'text-bg-secondary',
  [API_KEY_STATUS.revoked]: 'text-bg-danger',
};

const errorMessage = (err: unknown) => (err instanceof Error ? err.message : String(err));

/**
 * "Chaves de API" (019): generate keys to call the API without logging in (the full key is shown once), list
 * them with their situation and last use, revoke and delete.
 */
export const ApiKeysModal = ({ open, onOpenChange }: ApiKeysModalProps) => {
  const { t, i18n } = useTranslation();
  const [keys, setKeys] = useState<ApiKeyInfo[] | null>(null);
  const [form, setForm] = useState<ApiKeyForm>(EMPTY_FORM);
  const [creating, setCreating] = useState(false);
  const [created, setCreated] = useState<ApiKeyCreatedInfo | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toRevoke, setToRevoke] = useState<ApiKeyInfo | null>(null);
  const [toDelete, setToDelete] = useState<ApiKeyInfo | null>(null);

  const load = useCallback(async () => {
    try {
      setKeys(await apiKeyService.list());
    } catch (err) {
      setKeys([]);
      toast.error(errorMessage(err));
    }
  }, []);

  // Opening loads the list; closing forgets the form and, above all, the full key.
  useEffect(() => {
    if (open) {
      void load();
    } else {
      setForm(EMPTY_FORM);
      setCreated(null);
      setKeys(null);
    }
  }, [open, load]);

  const formatDate = (value: string | null, empty: string) => (value
    ? parseUtc(value).toLocaleString(i18n.language, { dateStyle: 'short', timeStyle: 'short' })
    : t(empty));

  const generate = async (event: FormEvent) => {
    event.preventDefault();
    const now = new Date();
    const problem = validateApiKeyForm(form, now);
    if (problem) {
      toast.error(t(problem));
      return;
    }
    try {
      setCreating(true);
      const expiresAt = expirationToDate(form.choice, form.dateText, now);
      const result = await apiKeyService.create({ name: form.name.trim(), expiresAt: expiresAt?.toISOString() ?? null });
      setCreated(result);
      setForm(EMPTY_FORM);
      toast.success(t('toast.apiKeyCreated'));
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setCreating(false);
    }
  };

  const copy = async () => {
    if (!created) return;
    try {
      await navigator.clipboard.writeText(created.key);
      toast.success(t('toast.apiKeyCopied'));
    } catch {
      toast.error(t('apiKeys.copyFailed'));
    }
  };

  const revoke = async () => {
    if (!toRevoke) return;
    try {
      setBusyId(toRevoke.apiKeyId);
      await apiKeyService.revoke(toRevoke.apiKeyId);
      toast.success(t('toast.apiKeyRevoked', { name: toRevoke.name }));
      setToRevoke(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    try {
      setBusyId(toDelete.apiKeyId);
      await apiKeyService.remove(toDelete.apiKeyId);
      toast.success(t('toast.apiKeyDeleted', { name: toDelete.name }));
      setToDelete(null);
      await load();
    } catch (err) {
      toast.error(errorMessage(err));
      throw err;
    } finally {
      setBusyId(null);
    }
  };

  return (
    <>
      <Modal open={open} onOpenChange={onOpenChange} title={t('apiKeys.title')} large>
        {created ? (
          <div className="alert alert-success" role="status">
            <h2 className="h6">{t('apiKeys.createdTitle', { name: created.name })}</h2>
            <code className="stm-api-key-secret d-block my-2" onFocus={(e) => window.getSelection()?.selectAllChildren(e.currentTarget)} tabIndex={0}>
              {created.key}
            </code>
            <p className="small mb-2">{t('apiKeys.createdHint')}</p>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-sm btn-success" onClick={() => { void copy(); }}>{t('apiKeys.copy')}</button>
              <button type="button" className="btn btn-sm btn-outline-light" onClick={() => setCreated(null)}>{t('apiKeys.copied')}</button>
            </div>
          </div>
        ) : (
          <form className="stm-api-key-form mb-3" onSubmit={(event) => { void generate(event); }}>
            <h2 className="h6">{t('apiKeys.newKey')}</h2>
            <div className="row g-2 align-items-end">
              <div className="col-md-5">
                <label className="form-label" htmlFor="api-key-name">{t('apiKeys.name')}</label>
                <input id="api-key-name" className="form-control" maxLength={API_KEY_MAX_NAME} value={form.name}
                  placeholder={t('apiKeys.namePlaceholder')} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="col-md-4">
                <label className="form-label" htmlFor="api-key-expiration">{t('apiKeys.expiration')}</label>
                <select id="api-key-expiration" className="form-select" value={form.choice}
                  onChange={(e) => setForm({ ...form, choice: e.target.value as ApiKeyExpiration })}>
                  {EXPIRATION_OPTIONS.map((option) => <option key={option.value} value={option.value}>{t(option.label)}</option>)}
                </select>
              </div>
              <div className="col-md-3 d-grid">
                <button type="submit" className="btn btn-primary" disabled={creating}>
                  {creating ? t('common.loading') : t('apiKeys.generate')}
                </button>
              </div>
              {form.choice === API_KEY_EXPIRATION.date && (
                <div className="col-md-5">
                  <label className="form-label" htmlFor="api-key-date">{t('apiKeys.expDateLabel')}</label>
                  <input id="api-key-date" type="date" className="form-control" min={tomorrowInBrasilia(new Date())}
                    value={form.dateText} onChange={(e) => setForm({ ...form, dateText: e.target.value })} />
                </div>
              )}
            </div>
            {form.choice === API_KEY_EXPIRATION.never && (
              <div className="alert alert-warning small mt-2 mb-0">{t('apiKeys.neverWarning')}</div>
            )}
          </form>
        )}

        <h2 className="h6">{t('apiKeys.list')}</h2>
        {keys === null ? (
          <p className="text-body-secondary">{t('common.loading')}</p>
        ) : keys.length === 0 ? (
          <p className="text-body-secondary">{t('apiKeys.empty')}</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-sm align-middle stm-api-key-table">
              <thead>
                <tr>
                  <th>{t('apiKeys.name')}</th>
                  <th>{t('apiKeys.key')}</th>
                  <th>{t('apiKeys.created')}</th>
                  <th>{t('apiKeys.expires')}</th>
                  <th>{t('apiKeys.lastUsed')}</th>
                  <th>{t('apiKeys.status')}</th>
                  <th aria-label={t('apiKeys.actions')} />
                </tr>
              </thead>
              <tbody>
                {keys.map((key) => (
                  <tr key={key.apiKeyId}>
                    <td className="text-break">{key.name}</td>
                    <td><code>{key.keyPrefix}…</code></td>
                    <td>{formatDate(key.createdAt, 'apiKeys.never')}</td>
                    <td>{formatDate(key.expiresAt, 'apiKeys.never')}</td>
                    <td>{formatDate(key.lastUsedAt, 'apiKeys.neverUsed')}</td>
                    <td><span className={`badge ${STATUS_BADGE[key.status]}`}>{t(`apiKeys.${key.status}`)}</span></td>
                    <td className="text-end">
                      {key.status === API_KEY_STATUS.active ? (
                        <button type="button" className="btn btn-sm btn-outline-danger" disabled={busyId === key.apiKeyId}
                          onClick={() => setToRevoke(key)}>{t('apiKeys.revoke')}</button>
                      ) : (
                        <button type="button" className="btn btn-sm btn-outline-secondary" disabled={busyId === key.apiKeyId}
                          onClick={() => setToDelete(key)}>{t('apiKeys.delete')}</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <p className="small text-body-secondary mb-0">{t('apiKeys.usage')} <code>X-Api-Key: r6_…</code></p>
      </Modal>

      <ConfirmModal
        open={toRevoke !== null}
        onOpenChange={(o) => { if (!o) setToRevoke(null); }}
        title={t('apiKeys.revokeTitle')}
        message={toRevoke ? t('apiKeys.revokeMessage', { name: toRevoke.name }) : ''}
        confirmLabel={t('apiKeys.revoke')}
        onConfirm={revoke}
        danger
      />
      <ConfirmModal
        open={toDelete !== null}
        onOpenChange={(o) => { if (!o) setToDelete(null); }}
        title={t('apiKeys.deleteTitle')}
        message={toDelete ? t('apiKeys.deleteMessage', { name: toDelete.name }) : ''}
        confirmLabel={t('apiKeys.delete')}
        onConfirm={remove}
        danger
      />
    </>
  );
};

export default ApiKeysModal;
