const { prepareResponse,sendResponse } = require('../utils/responseEntity');
const prisma = require("../config/prisma");

const newPayment = async (data) => {
    const { amount, month, call_up_no } = data;
    if (!amount || !month || !call_up_no) {
        return prepareResponse(400, false, 'Missing required fields', null);
    }

    try {
        const payment = await prisma.payment.create({
            data: {
                amount,
                month,
                call_up_no
            }
        });
        return prepareResponse(201, true, 'Payment created successfully', payment);
    } catch (err) {
        console.error("newPayment error:", err);
        return prepareResponse(500, false, 'Error creating payment', String(err?.message || err));
    }

}

const getStudentPaymentData = async (call_up_no) => {
    if (!call_up_no) {
        return prepareResponse(400, false, 'Missing required field: call_up_no', null);
    }

    try {
        // Fetch student with user details, batch details, and all payments
        const student = await prisma.student.findUnique({
            where: { call_up_no },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        mobile: true,
                        first_name: true,
                        last_name: true,
                        address: true,
                        is_active: true,
                        roles: true,
                    },
                },
                batch: true,
                payment: {
                    orderBy: { payment_date: 'asc' },
                },
            },
        });

        if (!student) {
            return prepareResponse(404, false, 'Student not found', null);
        }

        // Extract paid months from the payments
        const paidMonths = student.payment.map((p) => p.month);
        const paidAmounts = student.payment.map((p) => ({
            month: p.month,
            amount: p.amount,
            payment_date: p.payment_date,
            payment_id: p.id,
        }));

        // Total paid amount
        const totalPaid = student.payment.reduce((sum, p) => sum + p.amount, 0);

        // Generate expected months from batch creation to current month
        const batchStart = new Date(student.batch.created_at);
        const now = new Date();
        const expectedMonths = [];

        let year = batchStart.getFullYear();
        let month = batchStart.getMonth() + 1; // 1-indexed

        while (
            year < now.getFullYear() ||
            (year === now.getFullYear() && month <= now.getMonth() + 1)
        ) {
            const formatted = `${year}-${String(month).padStart(2, '0')}`;
            expectedMonths.push(formatted);
            month++;
            if (month > 12) {
                month = 1;
                year++;
            }
        }

        // Outstanding months = expected - paid
        const outstandingMonths = expectedMonths.filter(
            (m) => !paidMonths.includes(m)
        );

        // Monthly fee from batch
        const monthlyFee = student.batch.class_fee;
        const totalOutstanding = outstandingMonths.length * monthlyFee;

        const result = {
            student: {
                call_up_no: student.call_up_no,
                school: student.school,
                parent_name: student.parent_name,
                parent_mobile: student.parent_mobile,
                ...student.user,
            },
            batch: student.batch,
            payment_summary: {
                monthly_fee: monthlyFee,
                total_paid: totalPaid,
                total_outstanding: totalOutstanding,
                paid_count: paidMonths.length,
                outstanding_count: outstandingMonths.length,
            },
            paid_months: paidAmounts,
            outstanding_months: outstandingMonths,
        };

        return prepareResponse(200, true, 'Student payment data retrieved successfully', result);
    } catch (err) {
        console.error('getStudentPaymentData error:', err);
        return prepareResponse(500, false, 'Error retrieving student payment data', String(err?.message || err));
    }
}

const getPaymentsByStudent = async (call_up_no) => {
    try {
        const payments = await prisma.payment.findMany({
            where: { call_up_no },
        });
        return prepareResponse(200, true, 'Payments retrieved successfully', payments);
    } catch (err) {
        console.error("getPaymentsByStudent error:", err);
        return prepareResponse(500, false, 'Error retrieving payments', String(err?.message || err));
    }
}

const getAllPayments = async ({ page = 1, limit = 50, search = "", call_up_no = "", month = "" } = {}) => {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = {};
    const conditions = [];

    if (call_up_no) {
        conditions.push({ call_up_no: { contains: call_up_no } });
    }
    if (month) {
        conditions.push({ month: { contains: month } });
    }
    if (search) {
        conditions.push({
            OR: [
                { call_up_no: { contains: search } },
                { month: { contains: search } },
                { student: { user: { first_name: { contains: search } } } },
                { student: { user: { last_name: { contains: search } } } },
            ],
        });
    }

    if (conditions.length > 0) {
        where.AND = conditions;
    }

    try {
        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { payment_date: 'desc' },
                include: {
                    student: {
                        include: {
                            user: true,
                            batch: true,
                        },
                    },
                },
            }),
            prisma.payment.count({ where }),
        ]);

        return prepareResponse(200, true, 'Payments retrieved successfully', {
            data: payments,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: skip + payments.length < total,
                hasPrevious: page > 1,
            },
        });
    } catch (err) {
        console.error("getAllPayments error:", err);
        return prepareResponse(500, false, 'Error retrieving payments', String(err?.message || err));
    }
}

const getPaymentById = async (id) => {
    try {
        const payment = await prisma.payment.findUnique({
            where: { id },
        });
        if (!payment) {
            return prepareResponse(404, false, 'Payment not found', null);
        }
        return prepareResponse(200, true, 'Payment retrieved successfully', payment);
    } catch (err) {
        console.error("getPaymentById error:", err);
        return prepareResponse(500, false, 'Error retrieving payment', String(err?.message || err));
    }
}

const updatePayment = async (id, data) => {
    try {
        const payment = await prisma.payment.update({
            where: { id },
            data,
        });
        return prepareResponse(200, true, 'Payment updated successfully', payment);
    } catch (err) {
        console.error("updatePayment error:", err);
        return prepareResponse(500, false, 'Error updating payment', String(err?.message || err));
    }
}


const deletePayment = async (id) => {
    try {
        const payment = await prisma.payment.delete({
            where: { id },
        });
        return prepareResponse(200, true, 'Payment deleted successfully', payment);
    }
    catch (err) {
        console.error("deletePayment error:", err);
        return prepareResponse(500, false, 'Error deleting payment', String(err?.message || err));
    }
}

const searchPayments = async ({ call_up_no = "", month = "", batch = "", page = 1, limit = 50 } = {}) => {
    page = Number(page);
    limit = Number(limit);
    const skip = (page - 1) * limit;

    const where = {};
    const conditions = [];

    if (call_up_no) {
        conditions.push({ call_up_no: { contains: call_up_no } });
    }
    if (month) {
        conditions.push({ month: { contains: month } });
    }
    if (batch) {
        conditions.push({
            student: {
                batch: {
                    name: { contains: batch },
                },
            },
        });
    }

    if (conditions.length > 0) {
        where.AND = conditions;
    }

    try {
        const [payments, total] = await Promise.all([
            prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { payment_date: 'desc' },
                include: {
                    student: {
                        include: {
                            user: true,
                            batch: true,
                        },
                    },
                },
            }),
            prisma.payment.count({ where }),
        ]);

        return prepareResponse(200, true, 'Payments retrieved successfully', {
            data: payments,
            meta: {
                page,
                limit,
                total,
                pages: Math.ceil(total / limit),
                hasNext: skip + payments.length < total,
                hasPrevious: page > 1,
            },
        });
    } catch (err) {
        console.error("searchPayments error:", err);
        return prepareResponse(500, false, 'Error searching payments', String(err?.message || err));
    }
}


module.exports = {
    newPayment,
    getStudentPaymentData,
    getPaymentsByStudent,
    getAllPayments,
    getPaymentById,
    updatePayment,
    deletePayment,
    searchPayments
};