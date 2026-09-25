import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { Modal } from '../ui/Modal';
import { useAuth } from '../../hooks/useAuth';
import { MIN_PASSWORD_LENGTH, validatePasswordChange } from '../../lib/userForms';

interface ChangePasswordModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

/** Changes the password (current + new + confirmation); the user stays logged in. */
export const ChangePasswordModal = ({ open, onOpenChange }: ChangePasswordModalProps) => {
  const { t } = useTranslation();
  const { changePassword, loading } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const reset = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
  };

  useEffect(() => {
    if (open) reset();
  }, [open]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const error = validatePasswordChange({ currentPassword, newPassword, confirmPassword });
    if (error) {
      toast.error(t(`password.errors.${error}`, { min: MIN_PASSWORD_LENGTH }));
      return;
    }
    try {
      await changePassword({ currentPassword, newPassword });
      reset();
      toast.success(t('toast.passwordChanged'));
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <Modal
      open={open}
      onOpenChange={onOpenChange}
      title={t('password.title')}
      footer={(
        <>
          <button type="button" className="btn btn-secondary" onClick={() => onOpenChange(false)}>{t('common.cancel')}</button>
          <button type="submit" form="change-password-form" className="btn btn-primary" disabled={loading}>{t('common.save')}</button>
        </>
      )}
    >
      <form id="change-password-form" className="row g-3" onSubmit={onSubmit} noValidate>
        <div className="col-12">
          <label className="form-label" htmlFor="password-current">{t('password.current')}</label>
          <input id="password-current" type="password" className="form-control" autoComplete="current-password" autoFocus
            value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="password-new">{t('password.new')}</label>
          <input id="password-new" type="password" className="form-control" autoComplete="new-password"
            value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
        </div>
        <div className="col-12">
          <label className="form-label" htmlFor="password-confirm">{t('password.confirm')}</label>
          <input id="password-confirm" type="password" className="form-control" autoComplete="new-password"
            value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
        </div>
      </form>
    </Modal>
  );
};

export default ChangePasswordModal;
