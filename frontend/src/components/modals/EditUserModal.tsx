import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { MAX_NAME_LENGTH, validateName } from '../../lib/userForms';

interface EditUserModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Edits the logged user's name; the e-mail is the login and stays read-only. */
export const EditUserModal = ({ open, onOpenChange }: EditUserModalProps) => {
  const { t } = useTranslation();
  const { session, updateName, loading } = useAuth();
  const [name, setName] = useState('');

  useEffect(() => {
    if (open) setName(session?.user.name ?? '');
  }, [open, session?.user.name]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validateName(name);
    if (error) {
      toast.error(t(`profile.errors.${error}`));
      return;
    }
    try {
      await updateName(name);
      toast.success(t('toast.profileSaved'));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('profile.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</button>
          <button type="submit" form="edit-user-form" className="btn btn-primary" disabled={loading}>{t('common.save')}</button>
        </>
      )}
    >
      <form id="edit-user-form" className="row g-3" onSubmit={onSubmit} noValidate>
        <div className="col-12">
          <label className="form-label" htmlFor="profile-name">{t('profile.name')}</label>
          <input id="profile-name" className="form-control" maxLength={MAX_NAME_LENGTH} autoFocus
            value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="profile-email">{t('profile.email')}</label>
          <input id="profile-email" className="form-control" value={session?.user.email ?? ''} disabled readOnly />
        </div>
      </form>
    </Modal>
  );
};

export default EditUserModal;
