import os
import tempfile
import unittest
from app.engines.static.ioc_extractor import extract_iocs_from_file

class TestIOCExtractorFinancial(unittest.TestCase):
    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.test_file = os.path.join(self.test_dir, "test_financial.txt")
        
        content = """
        Here is some code that contains a UPI ID: testuser@okhdfcbank
        And another one: scammer99@ybl
        
        Now for some bank accounts. This IFSC SBIN0001234 is for SBI.
        Send money to account 12345678901.
        
        Here is a bank account without an IFSC nearby: 987654321098
        """
        with open(self.test_file, "w") as f:
            f.write(content)

    def tearDown(self):
        if os.path.exists(self.test_file):
            os.remove(self.test_file)
        if os.path.exists(self.test_dir):
            os.rmdir(self.test_dir)

    def test_extract_financial_indicators(self):
        results = extract_iocs_from_file(self.test_file)
        
        # Check UPI
        self.assertIn("testuser@okhdfcbank", results["upi_ids"])
        self.assertIn("scammer99@ybl", results["upi_ids"])
        
        # Check Bank/IFSC pairs
        pairs = results["ifsc_bank_pairs"]
        self.assertEqual(len(pairs), 1)
        self.assertEqual(pairs[0]["ifsc"], "SBIN0001234")
        self.assertEqual(pairs[0]["account_near"], "12345678901")
        
if __name__ == "__main__":
    unittest.main()
