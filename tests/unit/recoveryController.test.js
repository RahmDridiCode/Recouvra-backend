jest.mock('../../src/models/RecoveryAction');
jest.mock('../../src/models/Client');
jest.mock('../../src/models/Invoice');

const RecoveryAction = require('../../src/models/RecoveryAction');
const Client = require('../../src/models/Client');
const Invoice = require('../../src/models/Invoice');
const { createAction, listActions } = require('../../src/controllers/recoveryController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('recoveryController', () => {
  beforeEach(() => jest.clearAllMocks());

    it('listActions - success for admin', async () => {
        const mockActions = [{ _id: 'a1', note: 'n' }];
        const sortMock = jest.fn().mockResolvedValue(mockActions);
        const populateActionBy = jest.fn().mockReturnValue({ sort: sortMock });
        const populateInvoice = jest.fn().mockReturnValue({ populate: populateActionBy });
        RecoveryAction.find.mockReturnValue({ populate: populateInvoice });

        const req = { user: { role: 'admin' } };
        const res = mockRes();

        await listActions(req, res);

        expect(RecoveryAction.find).toHaveBeenCalledWith({});
        expect(populateInvoice).toHaveBeenCalled();
        expect(res.json).toHaveBeenCalledWith(mockActions);
    });
    
  it('listActions - agent filters by invoice', async () => {
    const clients = [{ _id: 'c1' }, { _id: 'c2' }];
    const invoices = [{ _id: 'i1' }, { _id: 'i2' }];
    const actions = [{ _id: 'a1' }, { _id: 'a2' }];

    Client.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(clients)
    });

    Invoice.find.mockReturnValue({
      select: jest.fn().mockResolvedValue(invoices)
    });

    const sortMock = jest.fn().mockResolvedValue(actions);
    const populateActionBy = jest.fn().mockReturnValue({ sort: sortMock });
    const populateInvoice = jest.fn().mockReturnValue({ populate: populateActionBy });
    RecoveryAction.find.mockReturnValue({ populate: populateInvoice });

    const req = { user: { role: 'agent', _id: 'agent1' } };
    const res = mockRes();

    await listActions(req, res);

    expect(Client.find).toHaveBeenCalledWith({ assignedTo: 'agent1' });
    expect(Invoice.find).toHaveBeenCalledWith({ client: { $in: clients.map(c => c._id) } });
    expect(RecoveryAction.find).toHaveBeenCalledWith({ invoice: { $in: invoices.map(i => i._id) } });
    expect(populateInvoice).toHaveBeenCalledWith({
      path: 'invoice',
      populate: { path: 'client' }
    });

    expect(res.json).toHaveBeenCalledWith(actions);
  });

  it('createAction - success', async () => {
    const payload = { name: 'Test Action' };

    const mockActionInstance = {
      ...payload,
      save: jest.fn().mockResolvedValue(true) 
    };
    RecoveryAction.mockImplementation(() => mockActionInstance);
    Invoice.findById.mockReturnValue({ populate: jest.fn().mockResolvedValue(null) });

    const req = { body: payload };
    const res = mockRes();

    await createAction(req, res);

    expect(mockActionInstance.save).toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      action: mockActionInstance,
      notification: { success: false, error: 'Invoice or client not found' }
    });
  });

  it('createAction - error', async () => {
    RecoveryAction.mockImplementation(() => ({ save: jest.fn().mockRejectedValue(new Error('bad')) }));
    const req = { body: {} };
    const res = mockRes();
    await createAction(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'bad' });
  });


});
