import { useEffect, useMemo, useState } from 'react';
import { Button, IconButton } from '@/components/app/Button';
import { Icon } from '@/components/app/Icon';
import { DialogActions, Modal } from '@/components/app/Modal';
import { ProductPageFrame } from '@/components/ProductPageFrame';

const INITIAL_VISIBLE_CARDS = 6;
const INITIAL_VISIBLE_METHOD_ROWS = 2;

function statusLabel(status) {
  return status === 'inactive' ? 'Inactive' : 'Active';
}

async function copyText(value) {
  if (!value || !navigator?.clipboard?.writeText) return false;
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

function maskAccountNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `•••••••••••••${digits.slice(-4)}` : '—';
}

function maskRoutingNumber(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits ? `•••••${digits.slice(-4)}` : '—';
}

function buildBankAccount(payload) {
  const last4 = String(payload.accountNumber || '').replace(/\D/g, '').slice(-4);

  return {
    id: `bank-${Date.now()}`,
    displayName: payload.displayName.trim(),
    name: payload.name.trim(),
    bankName: payload.bankName.trim(),
    last4,
    maskedAccount: maskAccountNumber(payload.accountNumber),
    accountNumber: payload.accountNumber.trim(),
    maskedRouting: maskRoutingNumber(payload.routingNumber),
    routingNumber: payload.routingNumber.trim(),
    address: payload.address.trim(),
  };
}

function buildCheckAddress(payload) {
  return {
    id: `check-${Date.now()}`,
    displayName: payload.displayName.trim(),
    name: payload.name.trim(),
    cityState: payload.cityState.trim(),
    summary: payload.summary.trim(),
    address: payload.address.trim(),
  };
}

function SectionIntro({ description, title }) {
  return (
    <div className="payment-section-intro">
      <h3>{title}</h3>
      <p>{description}</p>
    </div>
  );
}

function FilterTag({ label, onRemove, value }) {
  return (
    <span className="payment-filter-tag">
      <span className="payment-filter-tag-label">{label}</span>
      <span className="payment-filter-tag-value">{value}</span>
      <button type="button" className="payment-filter-tag-remove" onClick={onRemove}>
        <Icon name="close" />
      </button>
    </span>
  );
}

function CardDetailsModal({ card, copiedField, onClose, onCopy }) {
  if (!card) return null;

  return (
    <Modal
      open={Boolean(card)}
      onClose={onClose}
      title="Card details"
      description="View the revealed payment card details for this payer card."
    >
      <div className="payment-card-modal">
        <div className="payment-card-modal-preview">
          <div className="payment-card-brand">VISA</div>
          <div className="payment-card-number">{card.fullNumber}</div>
          <div className="payment-card-preview-meta">
            <span>{card.expiration}</span>
            <span>{card.holderName.toUpperCase()}</span>
          </div>
        </div>

        <div className="payment-card-details-grid">
          <div className="payment-detail-row">
            <dt>Pending amount</dt>
            <dd>{card.pendingAmount}</dd>
          </div>
          <div className="payment-detail-row">
            <dt>Cardholder name</dt>
            <dd>{card.holderName}</dd>
          </div>
          <div className="payment-detail-row">
            <dt>Card number</dt>
            <dd>
              <span>{card.fullNumber}</span>
              <button
                type="button"
                className="payment-copy-button"
                onClick={() => onCopy('card-number', card.fullNumber)}
              >
                <Icon name="copy" />
                {copiedField === 'card-number' ? 'Copied' : 'Copy'}
              </button>
            </dd>
          </div>
          <div className="payment-detail-row">
            <dt>Expires</dt>
            <dd>
              <span>{card.expiration}</span>
              <button
                type="button"
                className="payment-copy-button"
                onClick={() => onCopy('card-expiration', card.expiration)}
              >
                <Icon name="copy" />
                {copiedField === 'card-expiration' ? 'Copied' : 'Copy'}
              </button>
            </dd>
          </div>
          <div className="payment-detail-row">
            <dt>CVC2</dt>
            <dd>
              <span>{card.cvc}</span>
              <button
                type="button"
                className="payment-copy-button"
                onClick={() => onCopy('card-cvc', card.cvc)}
              >
                <Icon name="copy" />
                {copiedField === 'card-cvc' ? 'Copied' : 'Copy'}
              </button>
            </dd>
          </div>
          <div className="payment-detail-row payment-detail-row-address">
            <dt>Cardholder address</dt>
            <dd>{card.billingAddress}</dd>
          </div>
        </div>
      </div>

      <DialogActions>
        <Button tone="secondary" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Modal>
  );
}

function AddBankAccountModal({ form, onChange, onClose, onSubmit, open }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Bank Account"
      description="Add another bank account for the payment preferences route."
    >
      <form className="payment-form-grid" onSubmit={onSubmit}>
        <label>
          <span>Display name</span>
          <input
            required
            name="displayName"
            value={form.displayName}
            onChange={onChange}
          />
        </label>
        <label>
          <span>Legal name</span>
          <input required name="name" value={form.name} onChange={onChange} />
        </label>
        <label>
          <span>Bank name</span>
          <input required name="bankName" value={form.bankName} onChange={onChange} />
        </label>
        <label>
          <span>Account number</span>
          <input required name="accountNumber" value={form.accountNumber} onChange={onChange} />
        </label>
        <label>
          <span>Routing number</span>
          <input required name="routingNumber" value={form.routingNumber} onChange={onChange} />
        </label>
        <label className="payment-form-grid-span">
          <span>Address</span>
          <textarea required name="address" value={form.address} onChange={onChange} rows="4" />
        </label>

        <DialogActions>
          <Button tone="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" type="submit">
            Add Bank Account
          </Button>
        </DialogActions>
      </form>
    </Modal>
  );
}

function AddCheckAddressModal({ form, onChange, onClose, onSubmit, open }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Add Address"
      description="Add another check address for paper check preferences."
    >
      <form className="payment-form-grid" onSubmit={onSubmit}>
        <label>
          <span>Display name</span>
          <input
            required
            name="displayName"
            value={form.displayName}
            onChange={onChange}
          />
        </label>
        <label>
          <span>Recipient name</span>
          <input required name="name" value={form.name} onChange={onChange} />
        </label>
        <label>
          <span>City, state</span>
          <input required name="cityState" value={form.cityState} onChange={onChange} />
        </label>
        <label className="payment-form-grid-span">
          <span>Summary</span>
          <input required name="summary" value={form.summary} onChange={onChange} />
        </label>
        <label className="payment-form-grid-span">
          <span>Mailing address</span>
          <textarea required name="address" value={form.address} onChange={onChange} rows="4" />
        </label>

        <DialogActions>
          <Button tone="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button tone="primary" type="submit">
            Add Address
          </Button>
        </DialogActions>
      </form>
    </Modal>
  );
}

function LearnMoreModal({ onClose, open }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Automatic Card Processing"
      description="Automatically process eligible card payments without manual steps."
    >
      <div className="payment-modal-copy">
        <p>
          When automatic card processing is enabled, eligible card payments move through
          processing without a manual review step.
        </p>
        <p>
          Bank verification is still required before the route can be fully enabled for live
          payment processing.
        </p>
      </div>

      <DialogActions>
        <Button tone="secondary" onClick={onClose}>
          Close
        </Button>
      </DialogActions>
    </Modal>
  );
}

export function PaymentPreferencesPage({ data }) {
  const [stp, setStp] = useState(data.stp);
  const [cardsSearch, setCardsSearch] = useState('');
  const [cardsActiveOnly, setCardsActiveOnly] = useState(false);
  const [cardsExpanded, setCardsExpanded] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState([]);
  const [selectedStatuses, setSelectedStatuses] = useState([]);
  const [filterOpen, setFilterOpen] = useState(false);
  const [stpMenuOpen, setStpMenuOpen] = useState(false);
  const [detailsCard, setDetailsCard] = useState(null);
  const [copiedField, setCopiedField] = useState('');
  const [bankAccounts, setBankAccounts] = useState(data.bankAccounts);
  const [checkAddresses, setCheckAddresses] = useState(data.checkAddresses);
  const [revealedBankIds, setRevealedBankIds] = useState([]);
  const [showAllBanks, setShowAllBanks] = useState(false);
  const [showAllChecks, setShowAllChecks] = useState(false);
  const [showOptInModal, setShowOptInModal] = useState(false);
  const [optInConfirmed, setOptInConfirmed] = useState(false);
  const [showOptOutModal, setShowOptOutModal] = useState(false);
  const [showLearnMoreModal, setShowLearnMoreModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);
  const [showAddCheckModal, setShowAddCheckModal] = useState(false);
  const [bankForm, setBankForm] = useState({
    displayName: '',
    name: data.company.displayName,
    bankName: '',
    accountNumber: '',
    routingNumber: '',
    address: data.company.address,
  });
  const [checkForm, setCheckForm] = useState({
    displayName: '',
    name: data.company.displayName,
    cityState: '',
    summary: '',
    address: data.company.address,
  });

  useEffect(() => {
    if (!copiedField) return undefined;
    const timeoutId = window.setTimeout(() => setCopiedField(''), 1400);
    return () => window.clearTimeout(timeoutId);
  }, [copiedField]);

  useEffect(() => {
    function handleDocumentClick(event) {
      if (!event.target.closest('[data-payment-filter-root]')) setFilterOpen(false);
      if (!event.target.closest('[data-stp-menu-root]')) setStpMenuOpen(false);
    }

    document.addEventListener('click', handleDocumentClick);
    return () => document.removeEventListener('click', handleDocumentClick);
  }, []);

  const customerOptions = useMemo(() => {
    const counts = new Map();
    data.cards.forEach((card) => {
      counts.set(card.vendorName, (counts.get(card.vendorName) || 0) + 1);
    });

    return [...counts.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [data.cards]);

  const filteredCards = useMemo(() => {
    const query = cardsSearch.trim().toLowerCase();

    return data.cards.filter((card) => {
      if (query && !String(card.vendorName || '').toLowerCase().includes(query)) return false;
      if (selectedCustomers.length && !selectedCustomers.includes(card.vendorName)) return false;
      if (cardsActiveOnly && card.status !== 'active') return false;
      if (!cardsActiveOnly && selectedStatuses.length && !selectedStatuses.includes(card.status)) {
        return false;
      }
      return true;
    });
  }, [cardsActiveOnly, cardsSearch, data.cards, selectedCustomers, selectedStatuses]);

  const visibleCards = cardsExpanded
    ? filteredCards
    : filteredCards.slice(0, INITIAL_VISIBLE_CARDS);

  const visibleBankAccounts = showAllBanks
    ? bankAccounts
    : bankAccounts.slice(0, INITIAL_VISIBLE_METHOD_ROWS);

  const visibleCheckAddresses = showAllChecks
    ? checkAddresses
    : checkAddresses.slice(0, INITIAL_VISIBLE_METHOD_ROWS);

  const stpEnabled = stp.status === 'enabled';
  const stpPending = stp.status === 'in_progress';

  function updateBankForm(event) {
    const { name, value } = event.target;
    setBankForm((current) => ({ ...current, [name]: value }));
  }

  function updateCheckForm(event) {
    const { name, value } = event.target;
    setCheckForm((current) => ({ ...current, [name]: value }));
  }

  function toggleCustomer(name) {
    setCardsExpanded(false);
    setSelectedCustomers((current) =>
      current.includes(name) ? current.filter((value) => value !== name) : [...current, name],
    );
  }

  function toggleStatus(status) {
    setCardsExpanded(false);
    setSelectedStatuses((current) =>
      current.includes(status) ? current.filter((value) => value !== status) : [...current, status],
    );
  }

  function toggleBankReveal(accountId) {
    setRevealedBankIds((current) =>
      current.includes(accountId)
        ? current.filter((value) => value !== accountId)
        : [...current, accountId],
    );
  }

  async function handleCopy(fieldId, value) {
    const copied = await copyText(value);
    if (copied) setCopiedField(fieldId);
  }

  function handleBankSubmit(event) {
    event.preventDefault();
    setBankAccounts((current) => [...current, buildBankAccount(bankForm)]);
    setShowAllBanks(true);
    setShowAddBankModal(false);
    setBankForm({
      displayName: '',
      name: data.company.displayName,
      bankName: '',
      accountNumber: '',
      routingNumber: '',
      address: data.company.address,
    });
  }

  function handleCheckSubmit(event) {
    event.preventDefault();
    setCheckAddresses((current) => [...current, buildCheckAddress(checkForm)]);
    setShowAllChecks(true);
    setShowAddCheckModal(false);
    setCheckForm({
      displayName: '',
      name: data.company.displayName,
      cityState: '',
      summary: '',
      address: data.company.address,
    });
  }

  function handleEnableStp() {
    setStp({
      status: 'in_progress',
      step: 'bank_verification_required',
      fullyAutomated: false,
    });
    setShowOptInModal(false);
    setOptInConfirmed(false);
  }

  function handleVerifyStp() {
    setStp((current) => ({
      ...current,
      status: 'enabled',
      step: 'enabled',
    }));
  }

  function handleOptOutStp() {
    setStp({
      status: 'disabled',
      step: 'opt_in_required',
      fullyAutomated: false,
    });
    setShowOptOutModal(false);
  }

  return (
    <>
      <ProductPageFrame
        flushMobile
        page="payment-preferences.html"
        title="Payment Preferences"
      >
        <div className="page-stack payment-preferences-page">
        <div className="payment-tabs">
          <button type="button" className="payment-tab is-active">
            Payment Methods
          </button>
          <button type="button" className="payment-tab" disabled>
            Global Preferences
          </button>
          <button type="button" className="payment-tab" disabled>
            Advanced Settings
          </button>
        </div>

        <section className="payment-section-grid">
          <SectionIntro
            title="Payers' Cards"
            description="Accept payment by card."
          />

          <div className="payment-section-content">
            <div className="payment-stp-card">
              <div className="payment-stp-icon">
                <Icon name="card" className="size-5 text-blue-600" />
              </div>

              <div className="payment-stp-body">
                <div className="payment-stp-header">
                  <div className="payment-stp-title-wrap">
                    <p className="payment-stp-title">Automatic Card Processing (STP)</p>
                    {stpPending ? (
                      <span className="payment-status-badge payment-status-badge-pending">
                        Enabling pending
                      </span>
                    ) : null}
                    {stpEnabled ? (
                      <span className="payment-status-badge payment-status-badge-success">
                        Opted in
                      </span>
                    ) : null}
                  </div>

                  {stpEnabled || stpPending ? (
                    <div className="payment-stp-menu" data-stp-menu-root>
                      <IconButton
                        aria-label="Open STP actions"
                        onClick={(event) => {
                          event.stopPropagation();
                          setStpMenuOpen((current) => !current);
                        }}
                        tone="plain"
                      >
                        <Icon name="ellipsis" />
                      </IconButton>

                      {stpMenuOpen ? (
                        <div className="payment-inline-menu">
                          <button
                            type="button"
                            className="payment-inline-menu-item"
                            onClick={() => {
                              setShowLearnMoreModal(true);
                              setStpMenuOpen(false);
                            }}
                          >
                            Learn more
                          </button>
                          <button
                            type="button"
                            className="payment-inline-menu-item payment-inline-menu-item-danger"
                            onClick={() => {
                              setShowOptOutModal(true);
                              setStpMenuOpen(false);
                            }}
                          >
                            Opt out
                          </button>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <p className="payment-stp-copy">
                  Automatically process eligible payments with no manual steps. This option can
                  be turned off anytime.
                </p>

                {stpEnabled ? (
                  <label className="payment-toggle-row">
                    <span className={`payment-toggle ${stp.fullyAutomated ? 'is-checked' : ''}`}>
                      <input
                        type="checkbox"
                        checked={stp.fullyAutomated}
                        onChange={(event) =>
                          setStp((current) => ({
                            ...current,
                            fullyAutomated: event.target.checked,
                          }))
                        }
                      />
                      <span className="payment-toggle-track" />
                      <span className="payment-toggle-thumb" />
                    </span>
                    <span className="payment-toggle-copy">
                      <strong>Fully Automated</strong>
                      <span>
                        Payment is automatically processed by card. The "Get Paid" step is
                        included only when the transaction requires documents or signatures.
                      </span>
                    </span>
                  </label>
                ) : null}

                {stpPending ? (
                  <div className="payment-stp-alert">
                    <div>
                      <p>Verify your bank account to finish enabling automatic card processing.</p>
                      <p>
                        Complete the penny test to move this route from pending to active card
                        processing.
                      </p>
                    </div>
                    <div className="payment-stp-alert-actions">
                      <Button tone="primary" onClick={handleVerifyStp}>
                        Verify Bank Account
                      </Button>
                      <Button tone="secondary" onClick={() => setShowLearnMoreModal(true)}>
                        Learn More
                      </Button>
                    </div>
                  </div>
                ) : null}
              </div>

              {!stpEnabled && !stpPending ? (
                <div className="payment-stp-actions">
                  <Button tone="primary" onClick={() => setShowOptInModal(true)}>
                    Opt in
                  </Button>
                </div>
              ) : null}
            </div>

            <div className="payment-cards-toolbar">
              <label className="payment-search-field">
                <Icon name="chevronRight" className="payment-search-icon" />
                <input
                  type="text"
                  value={cardsSearch}
                  onChange={(event) => {
                    setCardsExpanded(false);
                    setCardsSearch(event.target.value);
                  }}
                  placeholder="Search"
                />
              </label>

              <div className="payment-toolbar-actions">
                <label className="payment-checkbox-row">
                  <input
                    type="checkbox"
                    checked={cardsActiveOnly}
                    onChange={(event) => {
                      setCardsExpanded(false);
                      setCardsActiveOnly(event.target.checked);
                    }}
                  />
                  <span>Show active only</span>
                </label>

                <div className="payment-filter-root" data-payment-filter-root>
                  <Button
                    tone="secondary"
                    className="payment-filter-button"
                    onClick={() => setFilterOpen((current) => !current)}
                  >
                    Filter
                    <Icon name="chevronDown" />
                  </Button>

                  {filterOpen ? (
                    <div className="payment-filter-panel">
                      <div className="payment-filter-group">
                        <p>Customer</p>
                        {customerOptions.map((option) => (
                          <label key={option.name} className="payment-filter-option">
                            <input
                              type="checkbox"
                              checked={selectedCustomers.includes(option.name)}
                              onChange={() => toggleCustomer(option.name)}
                            />
                            <span>{option.name}</span>
                            <span>{option.count}</span>
                          </label>
                        ))}
                      </div>

                      <div className="payment-filter-group">
                        <p>Status</p>
                        {['active', 'inactive'].map((status) => (
                          <label key={status} className="payment-filter-option">
                            <input
                              type="checkbox"
                              checked={selectedStatuses.includes(status)}
                              onChange={() => toggleStatus(status)}
                            />
                            <span>{statusLabel(status)}</span>
                            <span>{data.cards.filter((card) => card.status === status).length}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>

            {selectedCustomers.length || selectedStatuses.length ? (
              <div className="payment-filter-tags">
                {selectedCustomers.map((value) => (
                  <FilterTag
                    key={value}
                    label="By customer"
                    value={value}
                    onRemove={() => toggleCustomer(value)}
                  />
                ))}
                {selectedStatuses.map((value) => (
                  <FilterTag
                    key={value}
                    label="By status"
                    value={statusLabel(value)}
                    onRemove={() => toggleStatus(value)}
                  />
                ))}
              </div>
            ) : null}

            <div className="payment-cards-list">
              {visibleCards.map((card) => (
                <div
                  key={card.id}
                  className={`payment-card-row ${card.status === 'inactive' ? 'is-inactive' : ''}`}
                >
                  <div className="payment-card-row-left">
                    <div className="payment-card-chip">VISA</div>
                    <div className="payment-card-row-copy">
                      <span>{card.vendorName} •••• {card.last4}</span>
                      <span>Expiration {card.expiration}</span>
                    </div>
                  </div>

                  <div className="payment-card-row-actions">
                    <button
                      type="button"
                      className="payment-inline-link"
                      onClick={() => setDetailsCard(card)}
                    >
                      View card details
                    </button>
                    <a href="#/payables" className="payment-inline-link">
                      View associated payable(s)
                    </a>
                  </div>
                </div>
              ))}

              {!visibleCards.length ? (
                <div className="payment-empty-state">
                  <p>No payer cards match the current filters.</p>
                </div>
              ) : null}
            </div>

            {filteredCards.length > INITIAL_VISIBLE_CARDS ? (
              <button
                type="button"
                className="payment-show-more"
                onClick={() => setCardsExpanded((current) => !current)}
              >
                {cardsExpanded
                  ? 'Show less'
                  : `Show more (${filteredCards.length - INITIAL_VISIBLE_CARDS})`}
                <Icon
                  name="chevronDown"
                  className={cardsExpanded ? 'payment-show-more-icon is-open' : 'payment-show-more-icon'}
                />
              </button>
            ) : null}

            <div className="payment-section-divider" />

            <div className="payment-method-subsection">
              <div className="payment-subsection-header">
                <h4>Bank Accounts</h4>
                <Button tone="link" onClick={() => setShowAddBankModal(true)}>
                  <Icon name="plus" />
                  Add Bank Account
                </Button>
              </div>

              {!bankAccounts.length ? (
                <div className="payment-empty-state payment-empty-state-dashed">
                  <p>No bank accounts found.</p>
                </div>
              ) : null}

              {visibleBankAccounts.map((account) => {
                const revealed = revealedBankIds.includes(account.id);

                return (
                  <div key={account.id} className="payment-method-row">
                    <div className="payment-method-row-main">
                      <div className="payment-method-icon">
                        <Icon name="bank" />
                      </div>
                      <div className="payment-method-copy">
                        <span>{account.displayName}</span>
                        <span>{account.bankName} ••••{account.last4}</span>
                      </div>
                      <button
                        type="button"
                        className="payment-inline-link"
                        onClick={() => toggleBankReveal(account.id)}
                      >
                        <Icon name={revealed ? 'eyeSlash' : 'eye'} />
                        {revealed ? 'Hide Details' : 'Reveal Details'}
                      </button>
                    </div>

                    {revealed ? (
                      <div className="payment-detail-panel">
                        <div className="payment-detail-row">
                          <dt>Name</dt>
                          <dd>{account.name || account.displayName}</dd>
                        </div>
                        <div className="payment-detail-row">
                          <dt>Account Number</dt>
                          <dd>{account.accountNumber || account.maskedAccount}</dd>
                        </div>
                        <div className="payment-detail-row">
                          <dt>Routing Number</dt>
                          <dd>{account.routingNumber || account.maskedRouting}</dd>
                        </div>
                        <div className="payment-detail-row payment-detail-row-address">
                          <dt>Address</dt>
                          <dd>{account.address}</dd>
                        </div>
                      </div>
                    ) : null}
                  </div>
                );
              })}

              {bankAccounts.length > INITIAL_VISIBLE_METHOD_ROWS ? (
                <button
                  type="button"
                  className="payment-show-more"
                  onClick={() => setShowAllBanks((current) => !current)}
                >
                  {showAllBanks
                    ? 'Show less'
                    : `Show all (${bankAccounts.length - INITIAL_VISIBLE_METHOD_ROWS})`}
                  <Icon
                    name="chevronDown"
                    className={showAllBanks ? 'payment-show-more-icon is-open' : 'payment-show-more-icon'}
                  />
                </button>
              ) : null}
            </div>

            <div className="payment-section-divider" />

            <div className="payment-method-subsection">
              <div className="payment-subsection-header">
                <h4>Address for Checks</h4>
                <Button tone="link" onClick={() => setShowAddCheckModal(true)}>
                  <Icon name="plus" />
                  Add Address
                </Button>
              </div>

              {!checkAddresses.length ? (
                <div className="payment-empty-state payment-empty-state-dashed">
                  <p>No mailing addresses found.</p>
                </div>
              ) : null}

              {visibleCheckAddresses.map((address) => (
                <div key={address.id} className="payment-method-row">
                  <div className="payment-method-row-main">
                    <div className="payment-method-icon">
                      <Icon name="bank" />
                    </div>
                    <div className="payment-method-copy">
                      <span>{address.displayName}</span>
                      <span>{address.summary || address.cityState}</span>
                    </div>
                  </div>

                  <div className="payment-detail-panel payment-detail-panel-check">
                    <div className="payment-detail-row">
                      <dt>Recipient Name</dt>
                      <dd>{address.name}</dd>
                    </div>
                    <div className="payment-detail-row payment-detail-row-address">
                      <dt>Mailing Address</dt>
                      <dd>{address.address}</dd>
                    </div>
                  </div>
                </div>
              ))}

              {checkAddresses.length > INITIAL_VISIBLE_METHOD_ROWS ? (
                <button
                  type="button"
                  className="payment-show-more"
                  onClick={() => setShowAllChecks((current) => !current)}
                >
                  {showAllChecks
                    ? 'Show less'
                    : `Show all (${checkAddresses.length - INITIAL_VISIBLE_METHOD_ROWS})`}
                  <Icon
                    name="chevronDown"
                    className={showAllChecks ? 'payment-show-more-icon is-open' : 'payment-show-more-icon'}
                  />
                </button>
              ) : null}
            </div>
          </div>
        </section>
        </div>
      </ProductPageFrame>

      <CardDetailsModal
        card={detailsCard}
        copiedField={copiedField}
        onCopy={handleCopy}
        onClose={() => setDetailsCard(null)}
      />

      <Modal
        open={showOptInModal}
        onClose={() => {
          setShowOptInModal(false);
          setOptInConfirmed(false);
        }}
        title="Enable Automatic Card Processing"
        description="Review the setup and confirm the opt-in to start the verification flow."
      >
        <div className="payment-modal-copy">
          <p>
            Enabling Automatic Card Processing starts the bank-verification step required before
            eligible card payments can run without manual review.
          </p>
          <label className="payment-checkbox-row">
            <input
              type="checkbox"
              checked={optInConfirmed}
              onChange={(event) => setOptInConfirmed(event.target.checked)}
            />
            <span>I understand the route will enter verification before it can be fully enabled.</span>
          </label>
        </div>
        <DialogActions>
          <Button
            tone="secondary"
            onClick={() => {
              setShowOptInModal(false);
              setOptInConfirmed(false);
            }}
          >
            Cancel
          </Button>
          <Button tone="primary" disabled={!optInConfirmed} onClick={handleEnableStp}>
            Enable Processing
          </Button>
        </DialogActions>
      </Modal>

      <Modal
        open={showOptOutModal}
        onClose={() => setShowOptOutModal(false)}
        title="Opt out of Automatic Card Processing?"
        description="This turns off automatic card processing and resets the route back to the opt-in state."
      >
        <DialogActions>
          <Button tone="secondary" onClick={() => setShowOptOutModal(false)}>
            Cancel
          </Button>
          <Button tone="danger" onClick={handleOptOutStp}>
            Opt out
          </Button>
        </DialogActions>
      </Modal>

      <LearnMoreModal open={showLearnMoreModal} onClose={() => setShowLearnMoreModal(false)} />
      <AddBankAccountModal
        open={showAddBankModal}
        form={bankForm}
        onChange={updateBankForm}
        onClose={() => setShowAddBankModal(false)}
        onSubmit={handleBankSubmit}
      />
      <AddCheckAddressModal
        open={showAddCheckModal}
        form={checkForm}
        onChange={updateCheckForm}
        onClose={() => setShowAddCheckModal(false)}
        onSubmit={handleCheckSubmit}
      />
    </>
  );
}
