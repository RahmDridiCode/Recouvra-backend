jest.mock('../../src/models/Invoice');
jest.mock('../../src/models/Client');
jest.mock('../../src/models/Payment');
jest.mock('../../src/models/RecoveryAction');
jest.mock('../../src/models/User');

const Invoice = require('../../src/models/Invoice');
const Client = require('../../src/models/Client');
const Payment = require('../../src/models/Payment');
const RecoveryAction = require('../../src/models/RecoveryAction');
const User = require('../../src/models/User');
const { stats } = require('../../src/controllers/statsController');

const mockRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

describe('statsController.stats', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    Client.countDocuments.mockResolvedValue(0);
    Payment.countDocuments.mockResolvedValue(0);
    Payment.aggregate.mockResolvedValue([]);
    Invoice.aggregate.mockResolvedValue([]);
    RecoveryAction.countDocuments.mockResolvedValue(0);
    User.find.mockReturnValue({ select: jest.fn().mockResolvedValue([]) });
  });

  it('returns counts', async () => {
    // Ordre des appels : total, paid, unpaid, overdue
    Invoice.countDocuments
      .mockResolvedValueOnce(10)
      .mockResolvedValueOnce(5)
      .mockResolvedValueOnce(4)
      .mockResolvedValueOnce(1);

    const req = {};
    const res = mockRes();
    await stats(req, res);
    expect(Invoice.countDocuments).toHaveBeenCalled();
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({ totalInvoices: 10, paid: 5, unpaid: 4, overdue: 1 })
    );
  });

  it('returns 500 on db errors', async () => {
    Invoice.countDocuments.mockRejectedValue(new Error('db'));
    const req = {};
    const res = mockRes();
    await stats(req, res);
    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.json).toHaveBeenCalledWith({ message: 'db' });
  });
});
