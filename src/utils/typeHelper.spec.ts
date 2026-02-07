import { extractTypeArguments } from './typeHelper';

describe('typeHelper', () => {
  describe('extractTypeArguments', () => {
    it('should extract simple type arguments', () => {
      const typeStr = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::Pool<0x2::sui::SUI, 0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>';
      const result = extractTypeArguments(typeStr);
      
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBe('0x2::sui::SUI');
      expect(result![1]).toBe('0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN');
    });

    it('should handle nested generic types', () => {
      const typeStr = '0x123::wrapper::Wrapper<0x456::container::Container<0x789::inner::Inner>, 0xabc::other::Other>';
      const result = extractTypeArguments(typeStr);
      
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBe('0x456::container::Container<0x789::inner::Inner>');
      expect(result![1]).toBe('0xabc::other::Other');
    });

    it('should handle types with spaces', () => {
      const typeStr = '0x123::pool::Pool<0x2::sui::SUI,   0x456::usdc::USDC>';
      const result = extractTypeArguments(typeStr);
      
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBe('0x2::sui::SUI');
      expect(result![1]).toBe('0x456::usdc::USDC');
    });

    it('should return null for non-generic types', () => {
      const typeStr = '0x123::module::SimpleType';
      const result = extractTypeArguments(typeStr);
      
      expect(result).toBeNull();
    });

    it('should handle single type argument', () => {
      const typeStr = '0x123::wrapper::Wrapper<0x456::inner::Inner>';
      const result = extractTypeArguments(typeStr);
      
      expect(result).not.toBeNull();
      expect(result).toHaveLength(1);
      expect(result![0]).toBe('0x456::inner::Inner');
    });

    it('should handle three or more type arguments', () => {
      const typeStr = '0x123::triple::Triple<0x1::a::A, 0x2::b::B, 0x3::c::C>';
      const result = extractTypeArguments(typeStr);
      
      expect(result).not.toBeNull();
      expect(result).toHaveLength(3);
      expect(result![0]).toBe('0x1::a::A');
      expect(result![1]).toBe('0x2::b::B');
      expect(result![2]).toBe('0x3::c::C');
    });

    it('should handle real Cetus pool type from mainnet', () => {
      // Real example from Cetus pool on Sui mainnet
      const typeStr = '0x1eabed72c53feb3805120a081dc15963c204dc8d091542592abaf7a35689b2fb::pool::Pool<0x2::sui::SUI, 0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN>';
      const result = extractTypeArguments(typeStr);
      
      expect(result).not.toBeNull();
      expect(result).toHaveLength(2);
      expect(result![0]).toBe('0x2::sui::SUI');
      expect(result![1]).toBe('0x5d4b302506645c37ff133b98c4b50a5ae14841659738d6d733d59d0d217a93bf::coin::COIN');
    });
  });
});
