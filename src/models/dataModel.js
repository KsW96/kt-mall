const db = require('../config/db');
const { getMockData, addMockItem } = require('./mockData');

// MySQL 테이블 DDL (추후 DB 연결 시 자동 생성 또는 마이그레이션용)
const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  title VARCHAR(255) NOT NULL,
  category VARCHAR(100) NOT NULL,
  amount INT NOT NULL DEFAULT 0,
  status ENUM('COMPLETED', 'PENDING', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
  customer VARCHAR(100) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
`;

const DataModel = {
  /**
   * 목록 조회 (검색, 카테고리, 상태 필터링 및 페이징)
   */
  async findAll({ page = 1, limit = 10, keyword = '', category = '', status = '' }) {
    const offset = (page - 1) * limit;

    // 1. MySQL 연결 모드
    if (db.getDbStatus().connected) {
      try {
        let whereClauses = [];
        let params = [];

        if (keyword) {
          whereClauses.push('(title LIKE ? OR code LIKE ? OR customer LIKE ?)');
          const kwPattern = `%${keyword}%`;
          params.push(kwPattern, kwPattern, kwPattern);
        }
        if (category) {
          whereClauses.push('category = ?');
          params.push(category);
        }
        if (status) {
          whereClauses.push('status = ?');
          params.push(status);
        }

        const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';
        
        // 총 개수 조회
        const [countResult] = await db.query(`SELECT COUNT(*) as total FROM orders ${whereSql}`, params);
        const total = countResult[0]?.total || 0;

        // 목록 조회
        const [rows] = await db.query(
          `SELECT * FROM orders ${whereSql} ORDER BY id DESC LIMIT ? OFFSET ?`,
          [...params, parseInt(limit, 10), parseInt(offset, 10)]
        );

        return {
          items: rows,
          total,
          page: parseInt(page, 10),
          limit: parseInt(limit, 10),
          totalPages: Math.ceil(total / limit)
        };
      } catch (err) {
        console.error('MySQL findAll Error, falling back to mock:', err.message);
      }
    }

    // 2. Mock 데이터 모드 (Fallback)
    let filtered = [...getMockData()];

    if (keyword) {
      const kw = keyword.toLowerCase();
      filtered = filtered.filter(item =>
        item.title.toLowerCase().includes(kw) ||
        item.code.toLowerCase().includes(kw) ||
        item.customer.toLowerCase().includes(kw)
      );
    }

    if (category) {
      filtered = filtered.filter(item => item.category === category);
    }

    if (status) {
      filtered = filtered.filter(item => item.status === status);
    }

    const total = filtered.length;
    const paginatedItems = filtered.slice(offset, offset + parseInt(limit, 10));

    return {
      items: paginatedItems,
      total,
      page: parseInt(page, 10),
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit)
    };
  },

  /**
   * 단건 상세 조회
   */
  async findById(id) {
    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query('SELECT * FROM orders WHERE id = ?', [id]);
        return rows[0] || null;
      } catch (err) {
        console.error('MySQL findById Error:', err.message);
      }
    }

    const item = getMockData().find(d => String(d.id) === String(id));
    return item || null;
  },

  /**
   * 단건 등록 (업로드나 신규 생성 시 사용)
   */
  async create(data) {
    if (db.getDbStatus().connected) {
      try {
        const [result] = await db.query(
          'INSERT INTO orders (code, title, category, amount, status, customer, notes) VALUES (?, ?, ?, ?, ?, ?, ?)',
          [data.code, data.title, data.category, data.amount, data.status || 'PENDING', data.customer, data.notes || '']
        );
        return { id: result.insertId, ...data };
      } catch (err) {
        console.error('MySQL create Error:', err.message);
      }
    }

    return addMockItem(data);
  },

  /**
   * 전체 카테고리 목록 조회
   */
  async getCategories() {
    if (db.getDbStatus().connected) {
      try {
        const [rows] = await db.query('SELECT DISTINCT category FROM orders');
        return rows.map(r => r.category);
      } catch (err) {}
    }
    const categories = new Set(getMockData().map(d => d.category));
    return Array.from(categories);
  }
};

module.exports = DataModel;

